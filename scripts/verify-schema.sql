\set ON_ERROR_STOP on

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
      'product_cutoff_overrides'
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
      'idx_one_draft_per_date',
      'idx_order_items_product_conflict',
      'idx_order_items_pallet_conflict',
      'idx_profiles_access_token'
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
  expected_rls_tables text[] := array[
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
  ];
  missing text;
begin
  select string_agg(tablename, ', ')
  into missing
  from pg_tables
  where schemaname = 'public'
    and tablename = any(expected_rls_tables)
    and rowsecurity is distinct from true;

  if missing is not null then
    raise exception 'RLS not enabled on expected tables: %', missing;
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
      'profiles_customer_select_own',
      'profiles_customer_update_own',
      'profiles_salesman_all',
      'brands_authenticated_read',
      'brands_salesman_all',
      'products_authenticated_read_active',
      'products_salesman_all',
      'customer_products_customer_read_own',
      'customer_products_salesman_all',
      'pallet_deals_authenticated_read_active',
      'pallet_deals_salesman_all',
      'pallet_deal_items_authenticated_read',
      'pallet_deal_items_salesman_all',
      'orders_customer_select_own',
      'orders_customer_insert_own',
      'orders_customer_update_own_draft',
      'orders_salesman_all',
      'order_items_customer_select_own',
      'order_items_customer_manage_own_draft',
      'order_items_salesman_all',
      'order_cutoffs_salesman_all',
      'order_cutoffs_customer_read',
      'product_cutoff_overrides_salesman_all',
      'product_cutoff_overrides_customer_read'
    ]) as name
    except
    select policyname
    from pg_policies
    where schemaname = 'public'
  ) t;

  if missing is not null then
    raise exception 'Missing expected policies: %', missing;
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
      'is_salesman()',
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
      and column_name = 'access_token'
  ) then
    raise exception 'profiles.access_token column must exist';
  end if;
end
$$;

select 'schema_verification_passed' as result;
