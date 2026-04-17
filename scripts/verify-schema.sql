do $$
declare
  missing text;
begin
  select string_agg(name, ', ')
  into missing
  from (
    select unnest(array[
      'profiles',
      'brands',
      'products',
      'customer_products',
      'pallet_deals',
      'pallet_deal_items',
      'orders',
      'order_items',
      'order_cutoffs',
      'product_cutoff_overrides',
      'schema_migrations'
    ]) as name
    except
    select tablename
    from pg_tables
    where schemaname = 'public'
  ) t;

  if missing is not null then
    raise exception 'Missing expected public tables: %', missing;
  end if;
end
$$;

do $$
declare
  missing text;
begin
  select string_agg(name, ', ')
  into missing
  from (
    select unnest(array[
      'idx_profiles_access_token',
      'idx_profiles_auth_user_id',
      'idx_one_draft_per_date',
      'idx_order_items_product_conflict',
      'idx_order_items_pallet_conflict',
      'idx_products_pack_size',
      'idx_products_customer'
    ]) as name
    except
    select indexname
    from pg_indexes
    where schemaname = 'public'
  ) t;

  if missing is not null then
    raise exception 'Missing expected indexes: %', missing;
  end if;
end
$$;

do $$
declare
  table_with_rls text;
begin
  select c.relname
  into table_with_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any(array[
      'profiles',
      'brands',
      'products',
      'customer_products',
      'pallet_deals',
      'pallet_deal_items',
      'orders',
      'order_items',
      'order_cutoffs',
      'product_cutoff_overrides'
    ])
    and c.relrowsecurity is true
  limit 1;

  if table_with_rls is not null then
    raise exception 'RLS should not be enabled on rebuilt baseline tables: %', table_with_rls;
  end if;
end
$$;

do $$
declare
  policy_count int;
begin
  select count(*)
  into policy_count
  from pg_policies
  where schemaname = 'public';

  if policy_count > 0 then
    raise exception 'Public-schema policies should not exist in the rebuilt baseline';
  end if;
end
$$;

do $$
declare
  missing text;
begin
  select string_agg(name, ', ')
  into missing
  from (
    select unnest(array[
      'trg_profiles_updated_at',
      'trg_products_updated_at',
      'trg_orders_updated_at',
      'trg_update_order_totals'
    ]) as name
    except
    select tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and t.tgisinternal = false
  ) t;

  if missing is not null then
    raise exception 'Missing expected triggers: %', missing;
  end if;
end
$$;

do $$
declare
  missing text;
begin
  select string_agg(signature, ', ')
  into missing
  from (
    select unnest(array[
      'clone_order(uuid, date)',
      'submit_order(uuid)',
      'set_updated_at()',
      'update_order_totals()'
    ]) as signature
    except
    select format('%s(%s)', p.proname, coalesce(pg_catalog.oidvectortypes(p.proargtypes), ''))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ) t;

  if missing is not null then
    raise exception 'Missing expected functions: %', missing;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'customer_id'
      and is_nullable = 'NO'
  ) then
    raise exception 'orders.customer_id must be NOT NULL';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'order_items'
      and column_name = 'order_id'
      and is_nullable = 'NO'
  ) then
    raise exception 'order_items.order_id must be NOT NULL';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'auth_user_id'
  ) then
    raise exception 'profiles.auth_user_id column must exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'access_token'
  ) then
    raise exception 'profiles.access_token column must exist for transitional runtime compatibility';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'pack_count'
  ) then
    raise exception 'products.pack_count column must exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'size_value'
  ) then
    raise exception 'products.size_value column must exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'size_uom'
  ) then
    raise exception 'products.size_uom column must exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'customer_id'
  ) then
    raise exception 'products.customer_id column must exist';
  end if;
end
$$;

select 'schema_verification_passed' as result;
