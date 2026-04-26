-- Merge pallets into announcements.
--
-- A pallet was historically its own table (pallet_deals + pallet_deal_items)
-- with a single-line order commitment via order_items.pallet_deal_id. We're
-- collapsing it into the announcements model: a "deal" is just an
-- announcement whose products have locked quantities, committing as N
-- per-product order_items rows.
--
-- This migration:
--   1. Adds `kind` to announcements ('announcement' | 'deal').
--   2. Backfills existing pallet_deals as announcement rows with
--      content_type = 'specials_grid' (or 'product' for single-item pallets)
--      and product_quantities seeded from pallet_deal_items, all locked.
--   3. Drops pallet_deals, pallet_deal_items, order_items.pallet_deal_id
--      and the partial unique index on it. Replaces the XOR check
--      constraint with a plain `product_id is not null` check.
--
-- Pre-flight check (verified at authoring time): zero rows in order_items
-- reference any pallet_deal_id. Safe to drop the column with no backfill.

-- ---------------------------------------------------------------------------
-- 1. announcements.kind
alter table announcements
  add column if not exists kind text not null default 'announcement'
    check (kind in ('announcement', 'deal'));

create index if not exists idx_announcements_kind on announcements (kind);

-- ---------------------------------------------------------------------------
-- 2. Backfill pallets into announcements.
--    For each pallet, build a product_quantities jsonb of
--      { <product_id>: { default_qty: <quantity>, locked: true }, ... }
--    Then insert an announcement with:
--      - kind = 'deal'
--      - content_type = 'product' if exactly one item, else 'specials_grid'
--      - product_id  / product_ids accordingly
--      - title, body, image_url, sort_order copied from the pallet
--    "Empty" pallets (no items) get content_type='text' as a fallback so the
--    salesman can edit them later.

with pallet_with_items as (
  select
    pd.id                as pallet_id,
    pd.title,
    pd.description,
    pd.image_url,
    pd.is_active,
    pd.sort_order,
    coalesce(
      (
        select jsonb_object_agg(
                 pdi.product_id::text,
                 jsonb_build_object(
                   'default_qty', pdi.quantity,
                   'locked', true
                 )
               )
        from pallet_deal_items pdi
        where pdi.pallet_deal_id = pd.id
      ),
      '{}'::jsonb
    ) as quantities,
    coalesce(
      array(
        select pdi.product_id
        from pallet_deal_items pdi
        where pdi.pallet_deal_id = pd.id
        order by pdi.product_id
      ),
      '{}'::uuid[]
    ) as product_id_array
  from pallet_deals pd
)
insert into announcements (
  content_type,
  kind,
  title,
  body,
  image_url,
  product_id,
  product_ids,
  product_quantities,
  is_active,
  sort_order
)
select
  case
    when array_length(p.product_id_array, 1) = 1 then 'product'
    when array_length(p.product_id_array, 1) is null then 'text'
    else 'specials_grid'
  end                                                          as content_type,
  'deal'                                                       as kind,
  p.title,
  p.description,
  p.image_url,
  case
    when array_length(p.product_id_array, 1) = 1 then p.product_id_array[1]
    else null
  end                                                          as product_id,
  case
    when array_length(p.product_id_array, 1) > 1 then p.product_id_array
    else '{}'::uuid[]
  end                                                          as product_ids,
  p.quantities,
  coalesce(p.is_active, true),
  -- Place backfilled deals after existing announcements so they're visible
  -- but don't reshuffle anyone else's order.
  (select coalesce(max(sort_order), -1) + 1 from announcements) + p.sort_order
from pallet_with_items p;

-- ---------------------------------------------------------------------------
-- 3. Drop legacy pallet schema.

-- order_items pieces.
-- The original check constraint was anonymous (Postgres named it
-- `order_items_check`). Find and drop whichever check constraint
-- references pallet_deal_id, then drop the column itself.

do $$
declare
  con_name text;
begin
  select conname
    into con_name
  from pg_constraint
  where conrelid = 'public.order_items'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%pallet_deal_id%'
  limit 1;
  if con_name is not null then
    execute format('alter table order_items drop constraint %I', con_name);
  end if;
end$$;

drop index if exists idx_order_items_pallet_conflict;
alter table order_items drop column if exists pallet_deal_id;
alter table order_items
  add constraint order_items_product_required_check
    check (product_id is not null);

-- Replace clone_order — its insert listed pallet_deal_id, which now no
-- longer exists.
create or replace function clone_order(source_order_id uuid, new_delivery_date date)
returns uuid
language plpgsql
as $$
declare
  source_order orders%rowtype;
  new_order_id uuid;
begin
  select *
  into source_order
  from orders
  where id = source_order_id;

  if not found then
    raise exception 'Source order not found';
  end if;

  if exists (
    select 1 from orders
    where customer_id = source_order.customer_id
      and delivery_date = new_delivery_date
      and status = 'draft'
  ) then
    raise exception 'A draft already exists for this customer and delivery date';
  end if;

  insert into orders (customer_id, delivery_date, status)
  values (source_order.customer_id, new_delivery_date, 'draft')
  returning id into new_order_id;

  insert into order_items (order_id, product_id, quantity, unit_price)
  select new_order_id, product_id, quantity, unit_price
  from order_items
  where order_id = source_order_id
    and quantity > 0;

  return new_order_id;
end;
$$;

-- pallet tables
drop table if exists pallet_deal_items;
drop table if exists pallet_deals;
