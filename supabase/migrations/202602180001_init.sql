-- Universal Beverages baseline schema

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer', 'salesman')),
  business_name text,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  show_prices boolean not null default true,
  default_group text not null default 'brand' check (default_group in ('brand', 'size')),
  custom_pricing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id),
  title text not null,
  pack_details text,
  price numeric(10, 2) not null,
  image_url text,
  is_new boolean not null default false,
  is_discontinued boolean not null default false,
  tags text[],
  case_length numeric(6, 2),
  case_width numeric(6, 2),
  case_height numeric(6, 2),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_products (
  customer_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  excluded boolean not null default false,
  custom_price numeric(10, 2),
  primary key (customer_id, product_id)
);

create table if not exists pallet_deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  pallet_type text not null check (pallet_type in ('single', 'mixed')),
  image_url text,
  price numeric(10, 2) not null,
  savings_text text,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists pallet_deal_items (
  id uuid primary key default gen_random_uuid(),
  pallet_deal_id uuid not null references pallet_deals(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  unique (pallet_deal_id, product_id)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  delivery_date date not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'delivered')),
  total numeric(10, 2) not null default 0,
  item_count int not null default 0,
  submitted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  pallet_deal_id uuid references pallet_deals(id),
  quantity int not null default 0 check (quantity >= 0),
  unit_price numeric(10, 2) not null,
  line_total numeric(10, 2) generated always as (quantity * unit_price) stored,
  check (
    (product_id is not null and pallet_deal_id is null)
    or (product_id is null and pallet_deal_id is not null)
  )
);

create table if not exists order_cutoffs (
  id uuid primary key default gen_random_uuid(),
  cutoff_days int not null default 2,
  cutoff_time time not null default '17:00',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists product_cutoff_overrides (
  product_id uuid primary key references products(id) on delete cascade,
  cutoff_days int,
  cutoff_time time
);

create index if not exists idx_products_brand on products(brand_id);
create index if not exists idx_products_active on products(is_discontinued) where not is_discontinued;
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_delivery on orders(delivery_date);
create index if not exists idx_order_items_order on order_items(order_id);

create unique index if not exists idx_one_draft_per_date
  on orders(customer_id, delivery_date)
  where status = 'draft';

create unique index if not exists idx_order_items_product_conflict
  on order_items(order_id, product_id)
  where product_id is not null;

create unique index if not exists idx_order_items_pallet_conflict
  on order_items(order_id, pallet_deal_id)
  where pallet_deal_id is not null;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row
execute procedure set_updated_at();

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row
execute procedure set_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
before update on orders
for each row
execute procedure set_updated_at();

create or replace function update_order_totals()
returns trigger
language plpgsql
as $$
declare
  v_order_id uuid;
begin
  v_order_id = coalesce(new.order_id, old.order_id);

  update orders
  set
    total = coalesce((
      select sum(line_total) from order_items where order_id = v_order_id
    ), 0),
    item_count = coalesce((
      select sum(quantity) from order_items where order_id = v_order_id
    ), 0),
    updated_at = now()
  where id = v_order_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_update_order_totals on order_items;
create trigger trg_update_order_totals
after insert or update or delete on order_items
for each row
execute procedure update_order_totals();

create or replace function is_salesman()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid() and role = 'salesman'
  );
$$;

create or replace function submit_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  select *
  into v_order
  from orders
  where id = order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  if not (is_salesman() or v_order.customer_id = auth.uid()) then
    raise exception 'Not authorized to submit this order';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'Only draft orders can be submitted';
  end if;

  update orders
  set status = 'submitted', submitted_at = now(), updated_at = now()
  where id = order_id;
end;
$$;

create or replace function clone_order(source_order_id uuid, new_delivery_date date)
returns uuid
language plpgsql
security definer
set search_path = public
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

  if not (is_salesman() or source_order.customer_id = auth.uid()) then
    raise exception 'Not authorized to clone this order';
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

  insert into order_items (order_id, product_id, pallet_deal_id, quantity, unit_price)
  select new_order_id, product_id, pallet_deal_id, quantity, unit_price
  from order_items
  where order_id = source_order_id
    and quantity > 0;

  return new_order_id;
end;
$$;

alter table profiles enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table customer_products enable row level security;
alter table pallet_deals enable row level security;
alter table pallet_deal_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_cutoffs enable row level security;
alter table product_cutoff_overrides enable row level security;

-- Profiles
create policy "profiles_customer_select_own"
  on profiles
  for select
  using (id = auth.uid());

create policy "profiles_customer_update_own"
  on profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_salesman_all"
  on profiles
  for all
  using (is_salesman())
  with check (is_salesman());

-- Brands
create policy "brands_authenticated_read"
  on brands
  for select
  using (auth.uid() is not null);

create policy "brands_salesman_all"
  on brands
  for all
  using (is_salesman())
  with check (is_salesman());

-- Products
create policy "products_authenticated_read_active"
  on products
  for select
  using (auth.uid() is not null and not is_discontinued);

create policy "products_salesman_all"
  on products
  for all
  using (is_salesman())
  with check (is_salesman());

-- Customer product overrides
create policy "customer_products_customer_read_own"
  on customer_products
  for select
  using (customer_id = auth.uid());

create policy "customer_products_salesman_all"
  on customer_products
  for all
  using (is_salesman())
  with check (is_salesman());

-- Pallets
create policy "pallet_deals_authenticated_read_active"
  on pallet_deals
  for select
  using (auth.uid() is not null and is_active);

create policy "pallet_deals_salesman_all"
  on pallet_deals
  for all
  using (is_salesman())
  with check (is_salesman());

create policy "pallet_deal_items_authenticated_read"
  on pallet_deal_items
  for select
  using (auth.uid() is not null);

create policy "pallet_deal_items_salesman_all"
  on pallet_deal_items
  for all
  using (is_salesman())
  with check (is_salesman());

-- Orders
create policy "orders_customer_select_own"
  on orders
  for select
  using (customer_id = auth.uid());

create policy "orders_customer_insert_own"
  on orders
  for insert
  with check (customer_id = auth.uid());

create policy "orders_customer_update_own_draft"
  on orders
  for update
  using (customer_id = auth.uid() and status = 'draft')
  with check (customer_id = auth.uid());

create policy "orders_salesman_all"
  on orders
  for all
  using (is_salesman())
  with check (is_salesman());

-- Order items
create policy "order_items_customer_select_own"
  on order_items
  for select
  using (
    exists (
      select 1
      from orders
      where orders.id = order_items.order_id
        and orders.customer_id = auth.uid()
    )
  );

create policy "order_items_customer_manage_own_draft"
  on order_items
  for all
  using (
    exists (
      select 1
      from orders
      where orders.id = order_items.order_id
        and orders.customer_id = auth.uid()
        and orders.status = 'draft'
    )
  )
  with check (
    exists (
      select 1
      from orders
      where orders.id = order_items.order_id
        and orders.customer_id = auth.uid()
        and orders.status = 'draft'
    )
  );

create policy "order_items_salesman_all"
  on order_items
  for all
  using (is_salesman())
  with check (is_salesman());

-- Cutoffs
create policy "order_cutoffs_salesman_all"
  on order_cutoffs
  for all
  using (is_salesman())
  with check (is_salesman());

create policy "order_cutoffs_customer_read"
  on order_cutoffs
  for select
  using (auth.uid() is not null);

create policy "product_cutoff_overrides_salesman_all"
  on product_cutoff_overrides
  for all
  using (is_salesman())
  with check (is_salesman());

create policy "product_cutoff_overrides_customer_read"
  on product_cutoff_overrides
  for select
  using (auth.uid() is not null);

grant execute on function is_salesman() to authenticated;
grant execute on function submit_order(uuid) to authenticated;
grant execute on function clone_order(uuid, date) to authenticated;
