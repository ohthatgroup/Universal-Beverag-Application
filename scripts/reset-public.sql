-- Reset app-owned public schema objects for deterministic CI setup.

drop function if exists public.clone_order(uuid, date) cascade;
drop function if exists public.submit_order(uuid) cascade;
drop function if exists public.is_salesman() cascade;
drop function if exists public.update_order_totals() cascade;
drop function if exists public.set_updated_at() cascade;

drop table if exists public.customer_products cascade;
drop table if exists public.product_cutoff_overrides cascade;
drop table if exists public.order_cutoffs cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.pallet_deal_items cascade;
drop table if exists public.pallet_deals cascade;
drop table if exists public.products cascade;
drop table if exists public.brands cascade;
drop table if exists public.profiles cascade;
