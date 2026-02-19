-- Cleanup/fix for early pack backfill runs.
-- Ensures size_uom uses only supported units and re-backfills missing rows safely.

update products
set size_uom = upper(size_uom)
where size_uom is not null
  and size_uom <> upper(size_uom);

update products
set
  pack_count = null,
  size_value = null,
  size_uom = null
where size_uom is not null
  and size_uom not in ('OZ', 'ML', 'LITER', 'LITERS', 'GALLON', 'GALLONS', 'CT', 'ROLL', 'ROLLS');

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

alter table if exists products
  drop constraint if exists products_size_uom_allowed;
alter table if exists products
  add constraint products_size_uom_allowed
  check (
    size_uom is null
    or size_uom in ('OZ', 'ML', 'LITER', 'LITERS', 'GALLON', 'GALLONS', 'CT', 'ROLL', 'ROLLS')
  );
