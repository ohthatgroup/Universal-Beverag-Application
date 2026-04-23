alter table profiles
  add column if not exists tags text[] not null default '{}',
  add column if not exists location text,
  add column if not exists location_lat numeric,
  add column if not exists location_lng numeric;

create index if not exists profiles_tags_gin on profiles using gin (tags);
