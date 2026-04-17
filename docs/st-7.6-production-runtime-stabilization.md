# ST-7.6 Production Runtime Stabilization

## Purpose

Fix the production-only Cloudflare Workers runtime hang affecting DB-backed admin and invite flows.
This stage exists to keep the work bounded and source-driven instead of turning production rollout into repeated deploy/log churn.

## Current Root Cause

The current Worker DB helper uses a globally cached `pg.Pool` in `lib/server/db/index.ts`.
That is the wrong runtime model for Hyperdrive on Workers:

- Hyperdrive already maintains the underlying database connection pool
- Cloudflare's current Hyperdrive guidance is to create a new `pg.Client` per request
- reusing a global Node-style pool inside the Worker introduces a request-lifecycle mismatch for DB-backed routes

`ST-7.6` fixes that subsystem-level mismatch by moving the app to request-scoped `pg.Client` usage while keeping the existing `DbFacade` call shape intact.

## Fixed Input

Treat these as already-established symptoms, not open questions:

- production static auth pages can respond
- production DB-backed flows can hang and be canceled by the Workers runtime
- observed failure class includes:
  - `/admin/staff`
  - `/auth/accept-invite`

## Scope

- request lifecycle and runtime behavior for DB-backed routes on Workers
- Hyperdrive and `pg` usage in `lib/server/db/**`
- auth/admin flows that reproduce the production hang
- build/runtime configuration only when directly required to land the fix
- narrow verification updates in docs/tests/scripts

## Non-Goals

- no open-ended log spelunking as the primary workstream
- no route-by-route band-aids that avoid the underlying runtime problem
- no unrelated auth/product/admin UX changes
- no broad platform migration away from Workers unless this stage proves the current target is fundamentally non-viable

## Investigation Questions

- does the hang originate in Hyperdrive connection establishment, pool reuse, transaction usage, or request lifecycle mismatch on Workers?
- is the issue specific to React Server Components/RSC fetches, dynamic pages, or both page and route handlers?
- does the fix belong in DB connection management, runtime config, or the server-side auth/data-loading pattern?
- can the production failure be reproduced in preview after aligning environment/runtime conditions?

## Acceptance Criteria

- production deploy succeeds from the canonical scripts without introducing manual-only steps
- production `/admin/staff` responds successfully
- production invite flow reaches the expected password setup path without Worker cancellation
- preview and production smoke/manual verification pass after the fix
- the root cause and final fix are documented in the stage handoff/runbook

## Likely Write Scope

- `lib/server/db/**`
- `lib/server/staff-invites.ts`
- `app/(admin)/admin/staff/page.tsx`
- `app/auth/accept-invite/page.tsx`
- `wrangler.jsonc`
- `open-next.config.ts`
- `package.json`
- targeted tests or verification scripts

## Exit Deliverables

- code fix for the production runtime hang
- updated deployment/runtime docs
- recorded production verification outcome
