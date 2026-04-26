-- W6 — apply usuals to a draft order.
--
-- Helper used by the StartOrderDrawer's "Add my usuals" path. Either finds
-- the existing draft for (customer, delivery_date) or creates a new one,
-- then inserts one row per `customer_products.is_usual` product (skipping
-- discontinued products and rows already present in the draft).
--
-- Pricing: prefer `customer_products.custom_price` over `products.price`.
--
-- When `p_replace = true`, all existing line items on the draft are deleted
-- before the usuals are applied. Used by ConfirmReplaceDialog when the
-- customer confirms replacing an in-flight draft.

create or replace function apply_usuals_to_draft(
  p_customer_id uuid,
  p_delivery_date date,
  p_replace boolean default false
)
returns uuid
language plpgsql
as $$
declare
  v_order_id uuid;
begin
  -- Find or create the draft for this (customer, delivery_date).
  select id
  into v_order_id
  from orders
  where customer_id = p_customer_id
    and delivery_date = p_delivery_date
    and status = 'draft'
  limit 1;

  if v_order_id is null then
    insert into orders (customer_id, delivery_date, status)
    values (p_customer_id, p_delivery_date, 'draft')
    returning id into v_order_id;
  elsif p_replace then
    -- Replace flow: wipe existing items so the draft starts clean before
    -- the usuals fan out.
    delete from order_items where order_id = v_order_id;
  end if;

  -- Insert usuals. Skip products that already exist in the draft (so
  -- repeated clicks are idempotent) and skip discontinued products.
  insert into order_items (order_id, product_id, pallet_deal_id, quantity, unit_price)
  select
    v_order_id,
    cp.product_id,
    null::uuid,
    1,
    coalesce(cp.custom_price, p.price)
  from customer_products cp
  join products p on p.id = cp.product_id
  where cp.customer_id = p_customer_id
    and cp.is_usual = true
    and cp.excluded = false
    and p.is_discontinued = false
    and not exists (
      select 1
      from order_items oi
      where oi.order_id = v_order_id
        and oi.product_id = cp.product_id
    );

  return v_order_id;
end;
$$;
