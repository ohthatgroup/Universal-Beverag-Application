# Free Stack Rebuild Live Board

This file was recreated from the surviving session content after the docs cleanup pass removed the original working-tree copy. It preserves the current rebuild direction, stage status, and latest recorded handoff, but it may not match the deleted file byte-for-byte.

## Current Goal (Live)

Rebuild the application onto a fully free stack without preserving Supabase runtime contracts or compatibility routes.

Target stack:

- Cloudflare Workers + OpenNext
- Neon Postgres via Hyperdrive
- Neon Auth
- Resend
- R2
- Turnstile

Import scope:

- brands
- products
- pallet deals/items
- customer profiles/settings
- customer product overrides
- no orders
- no Supabase auth/session/token data

## Current Active Stage

- Active implementation target: `ST-7.6 Production Runtime Stabilization`
- `ST-5.5` remains maintenance-only until preview/live auth verification is taken through `ST-7.5`.
- `ST-5` is complete locally and should only take blocker-level fixes if a new regression is found.

## Locked Decisions

- No `/c/[token]/*` compatibility routes in the rebuild.
- Customer routes move directly to `/portal/*`.
- Admins use email/password sign-in.
- Customers use bearer-link portal access.
- Customer accounts are admin-created only.
- Public signup is disabled.
- Initial deployment target is `*.workers.dev`.
- `workers.dev` is acceptable for development and controlled pilot use, not broad production rollout.
- No order-history import.
- `profiles.id` remains the internal UUID identity for app data.
- `profiles.auth_user_id` becomes the auth-system mapping field.
- App-layer authorization remains authoritative via `profiles.role`.
- Dead or Supabase/Vercel-only docs must be cleaned up as part of the rebuild, not deferred indefinitely.
- `AGENTS.md` and `CLAUDE.md` are non-canonical agent knowledge files and should be ignored for rebuild scoping and doc-cleanup planning unless explicitly needed.

## Stage Snapshot

### ST-7: QA + Free-Tier Hardening

- Status: in progress
- Focus:
  - app-side rate limits for invite, token rotation, and uploads
  - local validation hardening
  - live email QA pass/fail recording

### ST-7.5: Preview + Live Deployment Runbook

- Status: complete
- Focus:
  - `wrangler.jsonc` preview/production envs
  - smoke checks and rollback path
  - deployed-domain verification for auth and portal links

### ST-7.6: Production Runtime Stabilization

- Status: in progress
- Write scope:
  - `lib/server/db/**`
  - auth/admin routes and pages that participate in the production hang
  - `wrangler.jsonc`, `package.json`, `open-next.config.ts` when runtime behavior demands it
  - focused tests and runtime docs only where needed to prove the fix
- Purpose:
  - isolate and fix the production Workers runtime hang affecting DB-backed admin and invite flows
  - treat the current production symptom as a bounded implementation problem, not an open-ended logging exercise
- Acceptance criteria:
  - production `workers.dev` deploy completes from the canonical scripts
  - production `/admin/staff` renders without Worker cancellation
  - production `/auth/accept-invite` completes the expected invite/password-setup flow without Worker cancellation
  - root cause is documented in code/docs at the subsystem level, not as a one-off manual workaround
  - preview and production smoke/manual verification pass after the runtime fix
- Fixed input symptom:
  - production static auth pages respond, but DB-backed routes such as `/admin/staff` and `/auth/accept-invite` hang and are canceled by the Workers runtime
- Non-goal:
  - do not burn stage time on unbounded log spelunking once the failure class is captured; use source-level investigation and targeted validation to land the fix
- Current root cause:
  - `lib/server/db/index.ts` was using a globally cached `pg.Pool` inside the Worker runtime
  - Hyperdrive already owns connection pooling, and Cloudflare's current guidance is to create a new `pg.Client` per request
  - `ST-7.6` therefore centers on replacing Worker-side pool reuse with a request-scoped client facade rather than adding route-specific retries or timeouts

### ST-8: Documentation Cleanup + Canonicalization

- Status: complete
- Write scope: `README.md`, `docs/**`, root planning docs, env examples
- Purpose: remove dead Supabase/Vercel-era documentation and leave one coherent set of rebuild/current-state docs.
- Acceptance criteria: no active doc tells an implementer to use Supabase, Vercel, token auth, or old env names unless explicitly marked historical.
- Last handoff:
  - Canonical doc entrypoints now point at the free-stack runtime instead of the retired Supabase/Vercel model.
  - `README.md` was rewritten around Workers + Neon + Neon Auth + Resend + `/portal/[token]/*`.
  - `architecture.md` was replaced with a current-state architecture reference.
  - `docs/README.md` indexed the active runbooks.
  - `docs/email-flows.md` owned the shipped email/share-flow contract.
  - Historical stage/planning docs that still mention superseded route or platform details were explicitly classified as background.

## Execution Rules

- `ST-0` must complete before any mutating implementation stage.
- `ST-0.5` should complete before `ST-1` so implementation stages are scoped by an explicit breadth map.
- Each stage agent begins by checking its dependency-search checklist and updating this board before code changes.
- Each stage agent only edits its listed write scope.
- `ST-5.5` can proceed in parallel with `ST-5` when the work is limited to admin auth and dashboard-managed staff invites.
- Missing environment values are not a reason to leave a stage half-designed. Implement everything except the secret/account-specific values, and document the exact inputs still needed.

## Status

- [x] `ST-0` complete
- [x] `ST-0.5` complete
- [x] `ST-1` complete
- [x] `ST-2` complete
- [x] `ST-3` complete
- [x] `ST-3.5` complete
- [x] `ST-4` complete
- [x] `ST-5` complete
- [~] `ST-5.5` in progress
- [x] `ST-6` complete
- [~] `ST-7` in progress
- [x] `ST-7.5` complete
- [~] `ST-7.6` in progress
- [x] `ST-8` complete

## Last Handoff

- Completed the `ST-7.5` preview rollout path and restored the canonical deployment runbook.
- Preview is live and smoke-verified on `https://universal-beverage-app-preview.inbox-23c.workers.dev`.
- Production deploy wiring exists, but runtime verification is blocked by a production-only Worker hang on DB-backed admin/invite flows.
- `ST-7.6` is the new bounded stage for fixing that runtime behavior at the code/runtime layer instead of continuing ad hoc deploy/log churn.

Commands run:

- `npm run cf:build`
- `npx wrangler deploy --dry-run --outdir bundled --env preview`
- `npm run smoke:preview`

Acceptance status:

- `ST-0` complete
- `ST-0.5` complete
- `ST-1` complete
- `ST-2` complete
- `ST-3` complete
- `ST-3.5` complete
- `ST-4` complete
- `ST-5` complete
- `ST-5.5` in progress
- `ST-6` complete
- `ST-7` in progress
- `ST-7.5` complete
- `ST-7.6` in progress
- `ST-8` complete

Remaining risks:

- `wireframes.md` had mojibake and old route assumptions before cleanup; it was treated as historical background, not active implementation guidance.
- Customer bearer-link access still depends on `profiles.access_token`, so future hardening or rotation changes must preserve the canonical `/portal/[token]` contract.
- The configured connection string uses `sslmode=require`; `pg` warns that explicit `sslmode=verify-full` is the safer future-proof choice.
- Live email QA for invite/setup/reset flows is still unrecorded against a deployed environment.
- Production remote verification still depends on running the final production deploy and smoke commands from an authenticated Cloudflare shell.
- `npm run cf:check:production` currently fails on this Windows/Node 25 workstation with an esbuild `.map` loader error in Wrangler's dry-run bundle path, so the dry-run command is not a reliable local gate here.
- Production currently shows a runtime hang in DB-backed routes, so `ST-7.5` deploy completeness does not yet imply production operational readiness.

Exact next stage unblockers:

- fix the production Worker hang under `ST-7.6`
- record pass/fail for live email QA under `ST-7`
- run `npm run deploy:production:live` from an authenticated Cloudflare shell
- run `npm run smoke:production` and record invite/reset/portal-link pass-fail for the deployed production `workers.dev` URL

## ST-7.5 Completion Record

- Preview Worker uploaded and activated on April 16, 2026:
  - Worker: `universal-beverage-app-preview`
  - Version: `3b82faab-7336-454b-97ad-0bfcde65b3f9`
  - URL: `https://universal-beverage-app-preview.inbox-23c.workers.dev`
- Preview trigger applied with `wrangler triggers deploy --env preview`
- Preview smoke verification passed for `/auth/login`, `/auth/reset-password`, and `/auth/callback?next=/auth/reset-password`
- Cloudflare free-plan size blocker resolved by removing Sentry runtime integration from the OpenNext Worker path
- Canonical deployment runbook now lives at `docs/st-7.5-preview-live-deployment-runbook.md`
