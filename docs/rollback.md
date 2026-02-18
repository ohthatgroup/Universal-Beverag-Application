# Rollback Runbook

## Trigger Criteria
- Sev1/Sev2 functional outage
- Corrupted order writes
- Auth outage for customer or salesman flows

## App Rollback (Vercel)
1. Open Vercel project deployments.
2. Promote the last known good deployment.
3. Re-run smoke checks on promoted deployment.

## Database Rollback
Database migrations are forward-first. If schema rollback is required:
1. Stop new writes (temporary maintenance mode or traffic pause).
2. Restore the last known good Supabase snapshot (PITR) for production.
3. Re-run schema verification (`scripts/verify-schema.sql`) and RLS verification script before reopening traffic.

## Data Recovery
If order data is affected:
1. Restore from Supabase PITR snapshot (if available).
2. Reconcile with API logs and recent CSV exports.

## Communication
- Notify internal stakeholders of rollback start and completion.
- Log root cause, impacted time window, and mitigation in incident tracker.

## CI Project Guardrail
- Never execute `db:reset` against production.
- Real CI reset/migrate/provision steps must target only the dedicated CI project ref enforced in `.github/workflows/ci.yml`.
