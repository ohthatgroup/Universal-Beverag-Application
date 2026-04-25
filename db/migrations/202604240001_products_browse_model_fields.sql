-- Adds normalized navigation metadata to products. Forward-only.
-- Columns are nullable or have safe defaults so existing rows continue to
-- read fine before any classification work.

alter table products
  add column if not exists product_family   text    not null default 'other',
  add column if not exists browse_model     text    not null default 'brand-led',
  add column if not exists subline          text,
  add column if not exists pack_key         text,
  add column if not exists water_type       text,
  add column if not exists price_point      text,
  add column if not exists is_zero_sugar    boolean not null default false,
  add column if not exists is_diet          boolean not null default false,
  add column if not exists is_caffeine_free boolean not null default false,
  add column if not exists is_sparkling     boolean not null default false,
  add column if not exists search_aliases   text[];

create index if not exists products_product_family_idx
  on products (product_family);

create index if not exists products_browse_model_idx
  on products (browse_model);

create index if not exists products_search_aliases_gin
  on products using gin (search_aliases);

comment on column products.product_family   is 'Family for primary nav: soda | water | sports_hydration | tea_juice | energy_coffee | other';
comment on column products.browse_model     is 'Family-specific secondary nav: format-led | water-type-led | subline-then-size | brand-led | price-point-led';
comment on column products.subline          is 'Sub-line within a brand (Gatorade Zero, Coke Zero, BodyArmor LYTE)';
comment on column products.pack_key         is 'Canonical normalized pack: e.g. 24x20oz_pet, 24x12oz_can, 6x2L_pet';
comment on column products.water_type       is 'still | sparkling | enhanced | coconut';
comment on column products.price_point      is 'Resale price-point program: 99c, 1.25, etc.';
comment on column products.search_aliases   is 'Alias-backed rescue search vocabulary: pack-notation variants, brand misspellings, etc.';
