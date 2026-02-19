-- Structured pack/size columns for catalog normalization.
-- Keep legacy pack_details for display/backward compatibility.

alter table if exists products
  add column if not exists pack_count int,
  add column if not exists size_value numeric(8, 3),
  add column if not exists size_uom text;

comment on column products.pack_count is 'Units per case (e.g. 24 in 24/12 OZ)';
comment on column products.size_value is 'Per-unit size value (e.g. 12 in 24/12 OZ)';
comment on column products.size_uom is 'Per-unit size unit of measure (e.g. OZ, ML, LITER)';

alter table if exists products
  drop constraint if exists products_pack_count_positive;
alter table if exists products
  add constraint products_pack_count_positive
  check (pack_count is null or pack_count > 0);

alter table if exists products
  drop constraint if exists products_size_value_positive;
alter table if exists products
  add constraint products_size_value_positive
  check (size_value is null or size_value > 0);

alter table if exists products
  drop constraint if exists products_size_uom_upper;
alter table if exists products
  add constraint products_size_uom_upper
  check (size_uom is null or size_uom = upper(size_uom));

alter table if exists products
  drop constraint if exists products_size_uom_allowed;
alter table if exists products
  add constraint products_size_uom_allowed
  check (
    size_uom is null
    or size_uom in ('OZ', 'ML', 'LITER', 'LITERS', 'GALLON', 'GALLONS', 'CT', 'ROLL', 'ROLLS')
  );

-- Require all-or-none structured size parts.
alter table if exists products
  drop constraint if exists products_size_components_consistent;
alter table if exists products
  add constraint products_size_components_consistent
  check (
    (pack_count is null and size_value is null and size_uom is null)
    or
    (pack_count is not null and size_value is not null and size_uom is not null)
  );

-- Best-effort backfill from existing pack_details values like "24/12 OZ", "15/1LITER", "24/17.6.OZ".
with parsed as (
  select
    id,
    regexp_match(
      upper(coalesce(pack_details, '')),
      '^\s*(\d+)\s*/\s*([0-9]+(?:\.[0-9]+)?)\.?\s*(OZ|ML|LITER|LITERS|GALLON|GALLONS|CT|ROLLS?)\b'
    ) as m
  from products
)
update products p
set
  pack_count = (parsed.m)[1]::int,
  size_value = (parsed.m)[2]::numeric(8, 3),
  size_uom = regexp_replace((parsed.m)[3], '\.$', '')
from parsed
where p.id = parsed.id
  and parsed.m is not null
  and p.pack_count is null
  and p.size_value is null
  and p.size_uom is null;

create index if not exists idx_products_pack_size
  on products(pack_count, size_value, size_uom)
  where pack_count is not null;
