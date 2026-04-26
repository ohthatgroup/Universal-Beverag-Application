-- Customer Groups + announcement override cascade.
--
-- Replaces the per-customer-only customer_announcements model with a
-- two-tier (group, customer) override cascade. The resolver order is:
--   1. customer override   (announcement_overrides where scope='customer')
--   2. group override      (announcement_overrides where scope='group')
--   3. global default      (announcements.sort_order / is_active)
--
-- Each customer belongs to AT MOST ONE group (1:1 from profiles to
-- customer_groups). That deliberately avoids the multi-group resolver
-- ambiguity — when the salesman wants two segments to share a deal
-- override, they put both customers in the same group.

-- ---------------------------------------------------------------------------
-- 1. Customer groups.

create table if not exists customer_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness so "Downtown" and "downtown" can't coexist.
create unique index if not exists customer_groups_name_lower_idx
  on customer_groups (lower(name));

create index if not exists customer_groups_sort_idx
  on customer_groups (sort_order);

drop trigger if exists trg_customer_groups_updated_at on customer_groups;
create trigger trg_customer_groups_updated_at
before update on customer_groups
for each row
execute procedure set_updated_at();

-- 1:1 group membership lives directly on profiles. ON DELETE SET NULL so
-- removing a group doesn't cascade-delete its customers.
alter table profiles
  add column if not exists customer_group_id uuid
    references customer_groups(id) on delete set null;

create index if not exists profiles_customer_group_idx
  on profiles (customer_group_id);

-- ---------------------------------------------------------------------------
-- 2. Drop the old per-customer overrides table; replace with the unified
--    announcement_overrides table.

drop table if exists customer_announcements;

create table if not exists announcement_overrides (
  announcement_id uuid not null references announcements(id) on delete cascade,
  -- 'group' → scope_id references customer_groups(id)
  -- 'customer' → scope_id references profiles(id)
  -- We deliberately don't FK scope_id polymorphically; integrity is
  -- maintained by application code + the customer-facing query joins.
  scope           text not null check (scope in ('group', 'customer')),
  scope_id        uuid not null,
  -- Override fields. NULL means "inherit from the parent scope" — the
  -- resolver only treats a column as overridden when the column itself is
  -- non-null on the most specific row.
  is_hidden       boolean,
  sort_order      integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (announcement_id, scope, scope_id)
);

create index if not exists announcement_overrides_scope_idx
  on announcement_overrides (scope, scope_id);

drop trigger if exists trg_announcement_overrides_updated_at on announcement_overrides;
create trigger trg_announcement_overrides_updated_at
before update on announcement_overrides
for each row
execute procedure set_updated_at();
