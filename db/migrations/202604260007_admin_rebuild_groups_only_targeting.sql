-- Admin Rebuild — Groups-only targeting.
--
-- Three coordinated schema changes that together collapse the parallel
-- "audience_tags vs customer_groups" targeting models onto a single
-- group-based one, and retire the customer-scope override layer.
--
--   1. Seed a "Default" customer_groups row + assign every existing
--      ungrouped customer to it. After this point, every customer has a
--      non-null customer_group_id.
--   2. Delete every customer-scope override row + tighten the scope
--      check constraint to allow only 'group'. Pre-launch — there is no
--      production data to preserve.
--   3. Add announcements.target_group_ids uuid[] (empty = visible to all
--      groups). Replaces audience_tags as the targeting mechanism;
--      audience_tags column stays for back-compat but is no longer
--      consulted by the resolver.
--
-- Dependencies: customer_groups + announcement_overrides + announcements
-- tables exist (migrations 202604260002, 202604260006). profiles has
-- customer_group_id (202604260006).

-- ---------------------------------------------------------------------------
-- 1. Seed Default group + assign ungrouped customers to it.

insert into customer_groups (name, description, sort_order)
values ('Default', 'Customers without a specific segment', 0)
on conflict do nothing;

-- The unique index is on lower(name); on-conflict-do-nothing handles
-- repeat runs even if the migration ever re-applies (it shouldn't).

update profiles
   set customer_group_id = (
     select id from customer_groups where lower(name) = 'default' limit 1
   )
 where role = 'customer'
   and customer_group_id is null;

-- ---------------------------------------------------------------------------
-- 2. Drop customer-scope overrides + tighten scope to 'group' only.

delete from announcement_overrides where scope = 'customer';

alter table announcement_overrides
  drop constraint if exists announcement_overrides_scope_check;
alter table announcement_overrides
  add  constraint announcement_overrides_scope_check check (scope = 'group');

-- ---------------------------------------------------------------------------
-- 3. Add target_group_ids to announcements.

alter table announcements
  add column if not exists target_group_ids uuid[] not null default '{}';

create index if not exists idx_announcements_target_group_ids
  on announcements using gin (target_group_ids);
