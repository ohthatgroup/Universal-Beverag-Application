# Production Readiness Checklist

## Last Verified
- Date (UTC): 2026-02-18
- Environment: Hosted Supabase project `wfcwnanssppbhzkkbqap` + local production build

## Gate Results
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run test`: PASS
- `npm run build`: PASS
- `npm run ci:prepare-db`: PASS
- `npm run db:types:check`: PASS
- `npm run verify:rls`: PASS
- `npm run test:e2e`: PASS

## Critical Readiness Assertions
- `inbox@ohthatgrp.com` profile exists and role is `salesman`: PASS
- Real-user RLS matrix for customer/salesman paths: PASS
- Strict TypeScript and strict linting re-enabled: PASS
- Generated DB types are checked for drift: PASS

## Notes
- CI workflow `.github/workflows/ci.yml` enforces a protected real-Supabase contract and run ordering.
- Ecwid remains disabled by feature flag for launch.
