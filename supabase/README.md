# Supabase Migrations

## Files
- `migrations/202602180001_init.sql`: baseline schema, indexes, RLS, triggers, RPCs
- `migrations/202602180002_seed.sql`: baseline seed records and optional salesman profile bootstrap

## Apply Order
Apply migrations in filename order.

If using Supabase CLI:
```bash
supabase db push
```

If applying manually in SQL editor, run the two files sequentially.
