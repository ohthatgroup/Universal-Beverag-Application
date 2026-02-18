# Incident Response

## Severity
- Sev1: Full ordering outage or widespread auth failures
- Sev2: Critical feature degraded (submission, status updates, CSV export)
- Sev3: Non-critical UI/admin issues

## First 15 Minutes
1. Identify impacted surface:
- customer ordering
- admin management
- API layer
- database/RLS
2. Check:
- Vercel deployment health
- Supabase status and query errors
- Sentry exceptions
- API logs by `x-request-id`
- most recent CI artifact `production-readiness-checklist`

## Mitigation Patterns
- Deploy rollback via Vercel promote
- Disable optional features (Ecwid remains disabled by default)
- Temporary route protection fallback to reduce bad writes

## Required Artifacts
- Timeline
- Impact summary
- Root cause
- Fix and preventive actions
- Follow-up owner and due date
- RLS verification output (`npm run verify:rls`)
