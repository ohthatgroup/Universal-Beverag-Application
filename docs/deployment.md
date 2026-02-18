# Deployment Runbook

## Prerequisites
- Vercel project connected to repository
- Supabase project configured with migrations applied
- Production environment variables set in Vercel
- Dedicated hosted Supabase CI project configured for `.github/workflows/ci.yml`

## Release Checklist
1. Ensure `main` CI is green:
- lint
- typecheck
- unit tests
- build
- e2e customer/admin flows
- RLS verification
- db types drift check
2. Confirm Supabase schema is up-to-date.
3. Confirm auth providers and redirect URLs are configured.
  - Site URL: `https://universal-beverag-application.vercel.app`
  - Redirect allowlist includes: `https://universal-beverag-application.vercel.app/auth/callback`
4. Confirm storage buckets exist and policy settings are correct.
5. Confirm `FEATURE_ECWID_PUSH` is set as intended.
6. Confirm `inbox@ohthatgrp.com` has a `salesman` profile record in `public.profiles`.
7. Confirm generated order links never point to localhost.

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
- verify customer/admin route isolation

## Post-Deploy Monitoring
- Review server logs for `internal_error` API responses.
- Review Sentry error feed (if enabled).
- Validate order write/read consistency in Supabase.
