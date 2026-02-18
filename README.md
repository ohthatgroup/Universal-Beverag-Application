# Universal Beverages App

Universal Beverages is a mobile-first ordering system built with Next.js and Supabase for beverage customers and sales operations.

## Stack
- Next.js App Router (v15)
- Supabase (Auth, Postgres, Storage, RLS)
- Tailwind + shadcn/ui
- Sentry (optional)

## Local Development
1. Install dependencies:
```bash
npm ci
```
2. Create `.env.local` from `.env.local.example` and fill Supabase keys.
3. Run the app:
```bash
npm run dev
```

## Quality Gates
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run verify:rls`
- `npm run db:types:check`

CI runs all of the above in `.github/workflows/ci.yml`.

## Database Setup
Schema and seed migrations are in `/supabase/migrations`.

### Required env vars for database scripts
- `SUPABASE_DB_URL` (preferred) or `POSTGRES_URL_NON_POOLING`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Deterministic setup commands
```bash
npm run db:reset
npm run db:migrate
npm run db:verify
npm run db:provision
```

One-shot CI/local reset:
```bash
npm run ci:prepare-db
```

### Generated DB typings
- Generate: `npm run db:types:generate`
- Check drift: `npm run db:types:check`

Type generation introspects the live DB via `SUPABASE_DB_URL` (or `POSTGRES_URL_NON_POOLING` fallback).

## Roles and Auth
- `customer`: magic link login and customer-facing order flow
- `salesman`: password login and admin dashboard routes

Middleware protects page routes by role. API routes enforce auth/role via server guards.

## API Response Contract
- Success: `{ "data": ... }`
- Error: `{ "error": { "code": string, "message": string, "details"?: unknown } }`

`GET /api/orders/:id/csv` returns CSV content directly.

## Launch Defaults
- Full-scope launch enabled
- Ecwid push disabled (`FEATURE_ECWID_PUSH=false`)
- Manual customer provisioning
- Single environment strategy

## CI Contract (Real Supabase Jobs)
The real-Supabase CI path is protected and expects a dedicated CI project (not production) with these secrets:
- `CI_SUPABASE_PROJECT_REF`
- `SUPABASE_DB_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CI_SALESMAN_EMAIL`, `CI_SALESMAN_PASSWORD`
- `CI_CUSTOMER_A_EMAIL`, `CI_CUSTOMER_A_PASSWORD`
- `CI_CUSTOMER_B_EMAIL`, `CI_CUSTOMER_B_PASSWORD`
- Optional: `CI_INBOX_EMAIL`, `CI_INBOX_PASSWORD`

## Operations Docs
- Deployment: `docs/deployment.md`
- Rollback: `docs/rollback.md`
- Incident response: `docs/incident-response.md`
- Implementation tasks: `docs/implementation-tasks.md`
- Production readiness checklist: `docs/production-readiness-checklist.md`
