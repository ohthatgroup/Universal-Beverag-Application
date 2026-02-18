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
2. Run targeted SQL rollback scripts for the last migration.
3. Validate RLS/policies before reopening traffic.

## Data Recovery
If order data is affected:
1. Restore from Supabase PITR snapshot (if available).
2. Reconcile with API logs and recent CSV exports.

## Communication
- Notify internal stakeholders of rollback start and completion.
- Log root cause, impacted time window, and mitigation in incident tracker.
