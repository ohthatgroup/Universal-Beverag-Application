-- Link a customer profile to the salesman (also a profile) who created it.
-- Nullable so existing customer rows survive the migration. ON DELETE SET
-- NULL: removing a salesman should not cascade-delete their customers.
-- Index supports the portal layout's "your salesman" join.
alter table profiles
  add column if not exists created_by uuid references profiles(id) on delete set null;

create index if not exists profiles_created_by_idx
  on profiles (created_by);
