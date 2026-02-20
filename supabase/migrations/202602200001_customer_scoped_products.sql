alter table if exists products
  add column if not exists customer_id uuid references profiles(id) on delete cascade;
