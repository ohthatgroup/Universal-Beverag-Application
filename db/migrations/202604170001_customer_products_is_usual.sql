alter table customer_products
  add column if not exists is_usual boolean not null default false;
