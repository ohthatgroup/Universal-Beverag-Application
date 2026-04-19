# ST-9 Live Remediation

## Purpose

This file is the active engineering remediation backlog for open `ST-9` production issues.

It is not a second certification matrix.

Use these files as the source of truth:

- Inventory: `docs/st-9-application-flow-inventory.md`
- Certification status: `docs/st-9-full-touchpoint-flow-certification.md`
- Production defects: `output/playwright/st-9/production/defects.md`
- Production mutation log: `output/playwright/st-9/production/live-mutations.md`

This file exists to answer:

1. What is still broken or blocked in production?
2. Which codepaths are the real likely owners?
3. In what order should the repo be remediated?
4. What must be re-run in production after each fix?

## Scope

Current scope is the open `production` `ST-9` fail and blocker set captured on `2026-04-16` through `2026-04-17`.

This file should track:

- open production failures
- production blockers that depend on a parent fix
- concrete repo surfaces to inspect
- retest scope per workstream

This file should not duplicate:

- passed rows that only need regression awareness
- full historical notes already preserved in `defects.md`
- speculative architecture rewrites that are not required to close `ST-9`

## Working Rules

### Closure Standard

A remediation item is only closed when:

1. agent 1 completes the code change locally
2. agent 1 runs the relevant local validation where practical
3. the change is deployed
4. agent 2 re-runs the affected `ST-9` production rows in the live browser
5. `docs/st-9-full-touchpoint-flow-certification.md` is updated immediately after the production re-run
6. any changed defect state is reflected in `output/playwright/st-9/production/defects.md`

Local success is support evidence only. It is not closure.

### Ownership Model

- Agent 1 owns:
  - code inspection
  - root-cause analysis
  - implementation
  - local validation
  - deploy readiness
- Agent 2 owns:
  - post-deploy live production verification
  - browser evidence capture
  - matrix updates after production re-test
- Default rule:
  - agent 2 should not be used until agent 1 has the fix deployed and locally validated
- Exception:
  - if a change is major and may alter the shape of downstream work, an earlier live validation pass is allowed to reduce forward risk before broader remediation continues

### Production Retest Discipline

- Re-run only the rows touched by the fix first.
- Use the same live-production browser workflow already established for `ST-9`.
- Restore live fixtures after mutating flows whenever possible.
- Update the matrix and logs after each verified flow, not at the end of a batch.
- Agent 2 takes over only after deployment by default.
- For major changes, explicitly record why early live validation is justified before handing off.

### Prioritization Rules

- Prioritize work that unblocks multiple blocked rows.
- Prefer root-cause fixes over page-specific patching when several defects share the same contract.
- Keep preview re-certification behind production defect closure unless a preview-only issue appears.

### Current Execution Model

This repo is a single Next.js App Router monolith with direct DB queries, Neon Auth, and R2-backed uploads.

The practical remediation loop is:

1. agent 1 inspects the real route/component/API files
2. agent 1 patches the smallest coherent defect family
3. agent 1 runs targeted local validation
4. agent 1 deploys the candidate
5. agent 2 re-runs the affected production `ST-9` rows
6. agent 2 updates certification docs immediately

Default handoff happens only after deployment and local pass.

Use an early live handoff only when the change is large enough that production behavior could materially change how the next stages should be planned.

## Repo Reality Check

The open production issues map to these real repo surfaces:

### Auth and Invite

- `app/auth/login/page.tsx`
- `app/auth/accept-invite/page.tsx`
- `app/api/auth/[...path]/route.ts`
- `lib/auth/client.ts`
- `lib/auth/server.ts`
- `lib/config/public-url.ts`
- `lib/server/staff-invites.ts`

### Admin Server-Action Pages

- `app/(admin)/admin/customers/page.tsx`
- `app/(admin)/admin/customers/[id]/page.tsx`
- `app/(admin)/admin/orders/[id]/page.tsx`
- `app/(admin)/admin/catalog/pallets/[id]/page.tsx`

### Admin Mutation UI

- `components/admin/staff-table-manager.tsx`
- `components/admin/orders-section.tsx`
- `components/admin/order-status-form.tsx`
- `components/admin/customers-table-manager.tsx`
- `components/admin/catalog-products-manager.tsx`

### Portal UI

- `app/(portal)/portal/[token]/page.tsx`
- `app/(portal)/portal/[token]/order/[date]/page.tsx`
- `components/orders/orders-list.tsx`
- `components/catalog/order-builder.tsx`

### Upload and Asset Handling

- `app/api/uploads/route.ts`
- `app/api/admin/brands/route.ts`
- `components/ui/image-upload.tsx`
- `components/ui/image-upload-field.tsx`
- `lib/server/assets.ts`

## Open Workstreams

## RM-01 Auth, Invite, and Password Reset Pipeline

### Priority

`P0`

### Why It Comes First

This cluster is the main blocker family. It keeps several auth rows in `not run with blocker` and also breaks first-time admin activation.

### Production Rows Owned

- Forgot-password trigger
- Reset email sent screen
- Reset password via `code`
- Reset password via `token`
- Reset password via email + OTP
- Reset success screen
- Accept invite
- Accepted invite to successful sign-in
- Admin password setup email
- Admin password reset email
- Deployed-domain CTA correctness
- Login code exchange

### Open Defects Tied To This Workstream

- `P1: Admin Forgot-Password Trigger Fails With Invalid redirectURL And Never Starts Reset Flow`
- `P1: Staff Invite Acceptance Never Reaches Password Setup`

### Current Repo Signals

- `app/auth/login/page.tsx` calls `authClient.resetPasswordForEmail(..., { redirectTo: buildInteractiveUrl('/auth/reset-password') })`
- `lib/auth/client.ts` builds the auth base URL from `buildInteractiveUrl('/api/auth')`
- `lib/config/public-url.ts` mixes env-derived public URLs with browser-origin interactive URLs
- `app/auth/accept-invite/page.tsx` redirects to `/auth/reset-email-sent` as soon as `triggerStaffInvitePasswordSetup()` returns `pending`
- `lib/server/staff-invites.ts` calls `auth.requestPasswordReset({ redirectTo: \`\${baseAppUrl()}/auth/reset-password\` })`

### Likely Root-Cause Areas

- redirect URL allowlisting or origin mismatch between interactive/browser origin and configured public auth origin
- invite flow treating "reset request accepted" as success without proving downstream email/setup actually completed
- production auth provider configuration drift relative to `NEXT_PUBLIC_APP_URL` / `APP_URL` / `NEON_AUTH_BASE_URL`

### First Inspection Order

1. `lib/config/public-url.ts`
2. `lib/auth/client.ts`
3. `app/auth/login/page.tsx`
4. `lib/server/staff-invites.ts`
5. production env assumptions used by Neon Auth redirect validation

### Retest Rows After Fix

Agent 1 local gate:

- targeted local auth reset/invite validation
- any focused tests or smoke checks added during the fix

Agent 2 production gate:

- Forgot-password trigger
- Reset email sent screen
- one supported reset completion path end-to-end
- Reset success screen
- Accept invite
- Accepted invite to successful sign-in
- Admin password setup email
- Admin password reset email
- Deployed-domain CTA correctness

## RM-02 Broken Admin Server-Action Form Posts

### Priority

`P0`

### Why It Comes Second

Several core admin forms currently post into a `307 -> /auth/login` failure pattern. This is one concrete defect family, not several unrelated bugs.

### Production Rows Owned

- Customers list search/add/open-detail
- Customer detail view and settings save
- Pallet deals list/detail/configuration
- Order detail view and lifecycle actions

### Open Defects Tied To This Workstream

- `P1: Admin Customer Save Form Breaks With Generic Error Boundary And Does Not Persist`
- `P1: Customers List Add Form Breaks With Generic Error Boundary And Does Not Create A Customer`
- `P1: Admin Order Detail Mark Delivered Action Breaks With Generic Error Boundary And Does Not Mutate`
- `P1: Pallet Deal Settings Save Redirects To Login And Does Not Persist`

### Current Repo Signals

The affected pages all define inline server actions that call `requirePageAuth(['salesman'])` inside the action body:

- `app/(admin)/admin/customers/page.tsx`
- `app/(admin)/admin/customers/[id]/page.tsx`
- `app/(admin)/admin/orders/[id]/page.tsx`
- `app/(admin)/admin/catalog/pallets/[id]/page.tsx`

`requirePageAuth()` is page-oriented and uses redirect semantics. That fits page entry but is suspicious inside server-action POST handlers where the observed production symptom is a redirect into `/auth/login`.

### Likely Root-Cause Areas

- page-level auth guard reused inside server actions instead of API/action-safe auth enforcement
- redirect semantics leaking into form posts
- missing action-path return handling after successful mutation

### First Inspection Order

1. `lib/server/page-auth.ts`
2. `lib/server/auth.ts`
3. the four affected page files above

### Retest Rows After Fix

Agent 1 local gate:

- targeted exercise of the affected server-action paths
- any focused regression checks around auth/page guards

Agent 2 production gate:

- Add Customer form
- Customer detail save
- Pallet settings save
- Order detail `Mark Delivered`

## RM-03 Stale UI After Successful Mutations

### Priority

`P1`

### Why This Is Separate

These defects are not failed writes. They are successful writes followed by stale client or route state.

### Production Rows Owned

- Revoke invite
- Dashboard bulk order update/delete
- Customer bulk delete
- Catalog reorder and bulk delete
- Cancel back to draft
- Order detail view and lifecycle actions

### Open Defects Tied To This Workstream

- `P2: Staff Revoke Invite Leaves The Row Stale Until Full Reload`
- `P1: Dashboard Bulk Order Actions Leave Stale And Ghost Rows`
- `P1: Customers Bulk Delete Leaves A Ghost Row In The List`
- `P1: Catalog Bulk Reorder And Delete Leave Stale Rows Until Reload`
- `P2: Portal Home Status Does Not Refresh After Submit/Cancel Mutations`
- `P2: Admin Order Detail Route Shows Stale Draft State Immediately After Successful Submit`

### Current Repo Signals

The affected client surfaces already call `router.refresh()`, but the production UI still remains stale in several places:

- `components/admin/staff-table-manager.tsx`
- `components/admin/orders-section.tsx`
- `components/admin/order-status-form.tsx`
- `components/orders/orders-list.tsx`
- `components/admin/customers-table-manager.tsx`
- `components/admin/catalog-products-manager.tsx`

This points to one or more of:

- stale optimistic/local component state not being cleared
- refresh landing on a route segment that does not actually re-fetch the mutated data
- inconsistent local state and server-rendered props after mutation

### First Inspection Order

1. client components that own local row state
2. whether the affected page re-queries data on refresh
3. whether route grouping or search-param state is preserving stale props

### Retest Rows After Fix

Agent 1 local gate:

- targeted mutation-refresh checks on the touched client components
- confirm stale local state is cleared after refresh

Agent 2 production gate:

- Revoke invite
- Dashboard bulk submit/delete
- Customer bulk delete
- Catalog reorder/delete
- Portal cancel back to draft
- Order detail draft -> submitted refresh behavior

## RM-04 Order Lifecycle Integrity

### Priority

`P1`

### Production Rows Owned

- Dashboard inline order status change
- Order detail view and lifecycle actions

### Open Defects Tied To This Workstream

- `P2: Admin Status Selectors Expose Impossible Delivered Transition From Draft Orders`
- part of `P1: Admin Order Detail Mark Delivered Action Breaks...`
- part of `P2: Admin Order Detail Route Shows Stale Draft State...`

### Current Repo Signals

Both admin status controls unconditionally expose:

- `draft`
- `submitted`
- `delivered`

That logic is present in:

- `components/admin/orders-section.tsx`
- `components/admin/order-status-form.tsx`

The backend correctly rejects illegal `draft -> delivered` transitions with `409`, which means the UI is violating the actual order lifecycle contract.

### First Inspection Order

1. derive the allowed transition matrix once
2. use it in both admin status controls
3. keep `Mark Delivered` and selector behavior consistent on order detail

### Retest Rows After Fix

Agent 1 local gate:

- targeted lifecycle transition checks
- confirm invalid transitions are no longer exposed in both admin controls

Agent 2 production gate:

- Dashboard inline order status change
- Order detail lifecycle actions

## RM-05 Runtime and Accessibility Defects

### Priority

`P1`

### Production Rows Owned

- Staff page load
- Portal home render and order visibility
- Order review sidebar/sheet and reset all

### Open Defects Tied To This Workstream

- `P1: Portal Home Emits Client-Side React Error On Load`
- `P2: Staff Page Emits Client-Side React Error On Load`
- `P2: Portal Review Sheet Violates Dialog Accessibility Contract`

### Current Repo Signals

- portal home route: `app/(portal)/portal/[token]/page.tsx`
- portal order builder/review sheet: `components/catalog/order-builder.tsx`
- staff page route: `app/(admin)/admin/staff/page.tsx`

The review-sheet defect is concrete and likely easy:

- `components/catalog/order-builder.tsx` uses `SheetContent`
- the production console reported missing accessible title/description wiring

The React `#418` issues need real inspection in the affected route trees before assuming a shared cause.

### First Inspection Order

1. fix the review sheet accessibility contract directly
2. inspect staff and portal-home component trees for hydration or client/server mismatch
3. do not assume the two `#418` errors are the same defect until reproduced locally or narrowed in code

### Retest Rows After Fix

Agent 1 local gate:

- inspect the affected route/component tree locally
- verify dialog or sheet accessibility wiring in the reviewed component

Agent 2 production gate:

- Staff page load
- Portal home render
- Order review sheet/reset all

## RM-06 Upload and Asset Integrity

### Priority

`P1`

### Production Rows Owned

- Admin asset upload success
- Uploaded asset render
- Brands search/create/edit/delete

### Open Defects Tied To This Workstream

- `P1: Brand Create Rejects Uploaded Relative Asset URLs`
- `P1: Portal Draft View Still References Retired Supabase Storage Host`
- `P2: Admin Brands Page Still References Retired Supabase Storage Host`

### Current Repo Signals

- `app/api/uploads/route.ts` returns relative `/uploads/...` URLs
- `app/api/admin/brands/route.ts` currently requires `logoUrl: z.string().url().nullable().optional()`
- `lib/server/assets.ts` intentionally builds local app-relative URLs

That brand create defect is a direct code contract mismatch, not a mysterious production-only issue.

The stale Supabase-host defects are likely data remediation plus rendering tolerance:

- legacy rows still contain old absolute storage URLs in DB
- the current UI renders them as-is

### Required Outcome

This workstream needs both:

1. forward fix: new uploads/create flows must work
2. backward fix: legacy stored asset URLs must no longer break production render

### First Inspection Order

1. `app/api/admin/brands/route.ts`
2. any shared brand/product media schema in server validation
3. render surfaces that output `logo_url` / `image_url`
4. data migration/backfill strategy for legacy Supabase-host rows
5. cleanup plan for orphaned test uploads

### Retest Rows After Fix

Agent 1 local gate:

- validate the brand upload/create contract locally
- validate legacy asset URL normalization or fallback behavior locally

Agent 2 production gate:

- Admin asset upload success
- Uploaded asset render
- Brands search/create/edit/delete
- portal builder image rendering sanity check

## RM-07 Deferred and Blocked Follow-Up

### Priority

`After parent fix`

### Rows Owned

- Login code exchange
- Profile-missing state
- Reset email sent screen
- Reset password via `code`
- Reset password via `token`
- Reset password via email + OTP
- Reset success screen
- Admin password reset email
- Deployed-domain CTA correctness
- Preview URL behavior

### Rule

Do not investigate these as standalone bugs until their parent workstreams are repaired.

Current parent dependencies:

- auth-reset rows depend on `RM-01`
- profile-missing depends on `RM-01` plus a safe fixture strategy
- deployed-domain CTA completeness depends on `RM-01`
- preview re-certification depends on production fail/blocker reduction

## Suggested Execution Order

### Default Sequence

1. Agent 1 completes `RM-01` locally, deploys, then hands off to agent 2 for live auth re-test
2. Agent 1 completes `RM-02` locally, deploys, then hands off to agent 2 for live admin form re-test
3. Agent 1 completes `RM-04` locally, deploys, then hands off to agent 2 for live lifecycle re-test
4. Agent 1 completes `RM-03` locally, deploys, then hands off to agent 2 for live stale-state re-test
5. Agent 1 completes `RM-06` locally, deploys, then hands off to agent 2 for live upload and asset re-test
6. Agent 1 completes `RM-05` locally, deploys, then hands off to agent 2 for live runtime and accessibility re-test
7. After the parent fixes land, agent 1 and then agent 2 clear `RM-07` blocked follow-up rows

### Exception Path

- If a workstream is a major change that could alter downstream planning, agent 2 may be brought in earlier for a narrow live validation before the rest of the sequence continues.
- This exception should be used sparingly and called out explicitly in the workstream notes or handoff.

Reasoning:

- `RM-01` unlocks the highest number of blocked rows and should be proven live before other auth-adjacent work builds on it.
- `RM-02` fixes several hard production write failures with a likely shared root cause and should be validated live before stale-state cleanup.
- `RM-04` is tight and contract-driven once the broken admin form paths are under control.
- `RM-03` should come after hard write-path fixes so stale-state debugging is not polluted by failed writes.
- `RM-06` has one straightforward contract mismatch plus legacy data/media cleanup, so it fits well after the core auth/admin write paths stabilize.
- `RM-05` may involve broader rendering behavior; keeping it later reduces cross-noise unless it turns out to be the major-change exception case.

## What "Done" Looks Like

This remediation effort is done only when:

1. every production row in `docs/st-9-full-touchpoint-flow-certification.md` is either `Pass` or an explicitly accepted blocker
2. no open `Fail` remains in the matrix
3. any still-blocked rows are intentionally deferred with a recorded reason
4. `output/playwright/st-9/production/defects.md` is updated to match the remaining real defects
5. the final rerun is reflected in the certification matrix immediately, not later

## Change Log

### 2026-04-17

- Rewrote this document to match the actual repo and current production evidence.
- Removed the stale dual-agent framing and the oversized pass-row backlog.
- Re-centered the file on open production defect families, real repo files, and the live `ST-9` remediation loop.
