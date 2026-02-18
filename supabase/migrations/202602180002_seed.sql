-- Universal Beverages seed data

insert into brands (name, sort_order)
select *
from (
  values
    ('Coca-Cola', 1),
    ('Pepsi', 2),
    ('Dr Pepper', 3)
) as seed(name, sort_order)
where not exists (
  select 1 from brands b where b.name = seed.name
);

insert into products (brand_id, title, pack_details, price, is_new, sort_order)
select
  (select id from brands where name = 'Coca-Cola' limit 1),
  'COKE CLASSIC',
  '24/12 OZ.',
  22.00,
  false,
  10
where not exists (select 1 from products where title = 'COKE CLASSIC' and pack_details = '24/12 OZ.');

insert into products (brand_id, title, pack_details, price, is_new, sort_order)
select
  (select id from brands where name = 'Coca-Cola' limit 1),
  'CHERRY COKE',
  '24/20 OZ.',
  28.50,
  true,
  11
where not exists (select 1 from products where title = 'CHERRY COKE' and pack_details = '24/20 OZ.');

insert into products (brand_id, title, pack_details, price, is_new, sort_order)
select
  (select id from brands where name = 'Pepsi' limit 1),
  'PEPSI',
  '24/12 OZ.',
  21.50,
  false,
  20
where not exists (select 1 from products where title = 'PEPSI' and pack_details = '24/12 OZ.');

insert into pallet_deals (title, pallet_type, price, savings_text, description, is_active, sort_order)
select
  'COKE CLASSIC PALLET',
  'single',
  1560.00,
  'Save $3.00/case',
  '80 cases of COKE CLASSIC 24/12 OZ.',
  true,
  10
where not exists (select 1 from pallet_deals where title = 'COKE CLASSIC PALLET');

insert into pallet_deal_items (pallet_deal_id, product_id, quantity)
select
  pd.id,
  p.id,
  80
from pallet_deals pd
join products p on p.title = 'COKE CLASSIC' and p.pack_details = '24/12 OZ.'
where pd.title = 'COKE CLASSIC PALLET'
  and not exists (
    select 1 from pallet_deal_items pdi
    where pdi.pallet_deal_id = pd.id and pdi.product_id = p.id
  );

-- Optional profile bootstrap for an existing auth user.
insert into profiles (id, role, business_name, contact_name, email)
select
  u.id,
  'salesman',
  'Universal Beverages',
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Salesman'),
  u.email
from auth.users u
where u.email = 'salesman@universalbeverages.local'
on conflict (id) do update set
  role = excluded.role,
  business_name = excluded.business_name,
  contact_name = excluded.contact_name,
  email = excluded.email;
