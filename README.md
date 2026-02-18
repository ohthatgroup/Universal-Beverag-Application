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

CI runs all of the above in `.github/workflows/ci.yml`.

## Database Setup
Schema and seed migrations are in `/supabase/migrations`.

Recommended flow:
1. Create Supabase project.
2. Apply `202602180001_init.sql`.
3. Apply `202602180002_seed.sql`.
4. Configure auth providers (magic link + password).
5. Create storage buckets:
- `product-images`
- `brand-logos`
- `pallet-images`

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

## Operations Docs
- Deployment: `docs/deployment.md`
- Rollback: `docs/rollback.md`
- Incident response: `docs/incident-response.md`
