-- W2 — announcements + per-customer overrides.
--
-- The `announcements` table backs the customer-facing homepage stack and the
-- admin authoring surface (/admin/announcements). The `customer_announcements`
-- table holds per-customer overrides so a salesman can hide an announcement
-- from one customer or pin one to the top for one customer specifically.
--
-- Hard-delete only — `customer_announcements` cascades from both parents so
-- removing an announcement also removes its overrides.

create table if not exists announcements (
  id                       uuid primary key default gen_random_uuid(),
  content_type             text not null check (content_type in
                             ('text','image','image_text','product','specials_grid')),
  title                    text,
  body                     text,
  image_url                text,
  cta_label                text,
  cta_target_kind          text check (cta_target_kind in ('products','product','url')),
  cta_target_url           text,
  cta_target_product_id    uuid references products(id) on delete set null,
  cta_target_product_ids   uuid[] not null default '{}',
  product_id               uuid references products(id) on delete set null,
  product_ids              uuid[] not null default '{}',
  badge_overrides          jsonb not null default '{}',
  audience_tags            text[] not null default '{}',
  starts_at                date,
  ends_at                  date,
  is_active                boolean not null default true,
  sort_order               integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_announcements_sort_order on announcements (sort_order);
create index if not exists idx_announcements_active_window
  on announcements (is_active, starts_at, ends_at);
create index if not exists idx_announcements_audience_tags
  on announcements using gin (audience_tags);

drop trigger if exists trg_announcements_updated_at on announcements;
create trigger trg_announcements_updated_at
before update on announcements
for each row
execute procedure set_updated_at();

create table if not exists customer_announcements (
  customer_id     uuid not null references profiles(id) on delete cascade,
  announcement_id uuid not null references announcements(id) on delete cascade,
  is_hidden       boolean not null default false,
  pin_sort_order  integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (customer_id, announcement_id)
);

create index if not exists idx_customer_announcements_customer
  on customer_announcements (customer_id);

drop trigger if exists trg_customer_announcements_updated_at on customer_announcements;
create trigger trg_customer_announcements_updated_at
before update on customer_announcements
for each row
execute procedure set_updated_at();
