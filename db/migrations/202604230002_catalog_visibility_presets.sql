-- Catalog visibility presets + per-customer visibility rules.
-- Salesmen curate what shows up in each customer's portal catalog via reusable
-- Presets (named rule sets for brands, sizes, and individual products). Applying
-- a preset replaces the customer's visibility rules; favorites and custom prices
-- are untouched.
--
-- Visibility rules live on both customer_* tables and preset_* tables with the
-- same shape, so the apply operation is a straight copy-over inside a txn.

-- Per-customer brand visibility
create table if not exists customer_brands (
  customer_id uuid not null references profiles(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  is_hidden boolean not null default false,
  is_pinned boolean not null default false,
  primary key (customer_id, brand_id)
);

create index if not exists idx_customer_brands_customer on customer_brands(customer_id);

-- Per-customer size visibility — sizes are identified by a canonical key
-- "<size_value>_<size_uom>" (e.g. "355_ML"). Sizes are hide-only at this level.
create table if not exists customer_sizes (
  customer_id uuid not null references profiles(id) on delete cascade,
  size_key text not null,
  is_hidden boolean not null default false,
  primary key (customer_id, size_key)
);

create index if not exists idx_customer_sizes_customer on customer_sizes(customer_id);

-- Per-product override flags on customer_products
alter table customer_products
  add column if not exists is_hidden boolean not null default false,
  add column if not exists is_pinned boolean not null default false;

-- Presets
create table if not exists presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_presets_updated_at on presets;
create trigger trg_presets_updated_at
before update on presets
for each row
execute procedure set_updated_at();

-- Preset brand rules
create table if not exists preset_brand_rules (
  preset_id uuid not null references presets(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  is_hidden boolean not null default false,
  is_pinned boolean not null default false,
  primary key (preset_id, brand_id)
);

create index if not exists idx_preset_brand_rules_preset on preset_brand_rules(preset_id);

-- Preset size rules
create table if not exists preset_size_rules (
  preset_id uuid not null references presets(id) on delete cascade,
  size_key text not null,
  is_hidden boolean not null default false,
  primary key (preset_id, size_key)
);

create index if not exists idx_preset_size_rules_preset on preset_size_rules(preset_id);

-- Preset product overrides
create table if not exists preset_product_rules (
  preset_id uuid not null references presets(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  is_hidden boolean not null default false,
  is_pinned boolean not null default false,
  primary key (preset_id, product_id)
);

create index if not exists idx_preset_product_rules_preset on preset_product_rules(preset_id);
