# Deployment Runbook

## Prerequisites
- Vercel project connected to repository
- Supabase project configured with migrations applied
- Production environment variables set in Vercel

## Release Checklist
1. Ensure `main` CI is green:
- lint
- typecheck
- unit tests
- build
- e2e smoke
2. Confirm Supabase schema is up-to-date.
3. Confirm auth providers and redirect URLs are configured.
4. Confirm storage buckets exist and policy settings are correct.
5. Confirm `FEATURE_ECWID_PUSH` is set as intended.

## Deploy Steps
1. Merge approved PR into `main`.
2. Wait for Vercel production deployment to complete.
3. Verify these pages quickly:
- `/auth/login`
- `/` (customer home)
- `/admin/dashboard`
- `/admin/orders`
4. Execute smoke checks:
- create or continue draft order
- submit order
- download order CSV
- update order status in admin

## Post-Deploy Monitoring
- Review server logs for `internal_error` API responses.
- Review Sentry error feed (if enabled).
- Validate order write/read consistency in Supabase.
