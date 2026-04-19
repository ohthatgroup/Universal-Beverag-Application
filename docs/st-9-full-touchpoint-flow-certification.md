# ST-9 Full Touchpoint and Flow Certification

## Purpose

`ST-9` is the final release-certification stage for the rebuilt app. It exists to prove that every supported user/operator touchpoint and end-to-end flow is classified on both preview and production, using Playwright-driven physical testing plus collaborative manual verification for items that are not trustworthy as fully automated checks.

The supported product surface for this stage is grounded in `docs/st-9-application-flow-inventory.md`. If the matrix and the inventory diverge, the inventory wins and the matrix must be updated.

This stage starts only after:

- `ST-7.6` is complete
- preview and production URLs are stable
- auth, email, DB, and asset env/config are already in place

## Execution Model

- Playwright is the primary test driver.
- Local runs are for setup/debug only.
- Preview is the first certification target.
- Production repeats the same matrix on the deployed live URL.
- Every flow must end in one of:
  - `pass`
  - `fail`
  - `not run with blocker`

## Certification Commands

- Local certification prep:
  - `npm run test:e2e:certification`
- Preview certification:
  - `npm run test:e2e:certification:preview`
- Production certification:
  - `npm run test:e2e:certification:production`

If a nonstandard deployed URL must be used, override it with `PLAYWRIGHT_BASE_URL`.

## Current Automated Certification Baseline

The checked-in Playwright certification suite is intentionally organized by subsystem, not by ad hoc smoke pages.

Current automated coverage in `tests/e2e/certification` includes:

- admin auth entry and protected-route checks
- signed-in admin route rendering for:
  - dashboard
  - customers
  - catalog
  - brands
  - staff
  - reports
- admin orders entrypoint redirect behavior
- customer portal bearer-link home render
- customer account route render
- canonical `/portal/[token]` routing behavior
- legacy `/c/[token]/*` compatibility redirects
- invalid-token not-found behavior

This automated baseline now certifies route-level entry and navigation behavior for the main supported surfaces, but it does **not** yet certify every mutation or lifecycle in the inventory. The remaining gaps should be filled according to the inventory, not by adding arbitrary page checks.

This baseline is not sufficient to complete `ST-9`. It is the minimum executable certification skeleton. The remaining matrix rows still need either:

- additional Playwright coverage
- collaborative manual verification
- or an explicit blocked/not-run classification

## Artifact Standard

Every failed or manually-reviewed flow should record:

- URL tested
- environment (`preview` or `production`)
- screenshot and/or video path when useful
- request/response evidence when relevant
- DB verification query/result if the flow mutates state
- exact failing step or manual observation

Use artifact folders under `output/playwright/st-9/` grouped by environment and subsystem.

## Manual Collaboration Checklist

These require human observation even when the scripted path exists:

- staff invite email receipt, sender, copy, and CTA target
- admin password setup/reset email receipt, sender, copy, and CTA target
- customer portal access-link share/copy wording and final URL
- visual/copy correctness on key operator screens
- operator judgment flows such as copy-link/share/regenerate/revoke

Each manual check must be recorded as `pass`, `fail`, or `not run with blocker`.

## Certification Matrix

### Admin Auth

| Flow | Audience | Entrypoint / trigger | Required fixture | Preview | Production | Artifact / note |
| --- | --- | --- | --- | --- | --- | --- |
| Login page render | salesman | `/auth/login` | deployed app URL | Not run | Pass | Manual production check; login form rendered on 2026-04-16 |
| Password sign-in | salesman | `/auth/login` | valid admin account | Not run | Pass | Manual production sign-in succeeded and landed on `/admin/dashboard` |
| Login code exchange | salesman | `/auth/login?code=...` | valid auth callback code | Not run | Not run with blocker | Blocked on 2026-04-17 pending a fresh valid auth callback code or email/link handoff; direct password sign-in does not surface a reusable `code` |
| Forgot-password trigger | salesman | `/auth/login` | valid admin email | Not run | Fail | Stayed on `/auth/login`, showed `Invalid redirectURL`, and `POST /api/auth/request-password-reset` returned `403`. Post-deploy re-test on 2026-04-17 after Cloudflare version `c4179e4c-dee7-43a8-8077-a686480e67cb` still failed with the same behavior. Artifacts: `output/playwright/st-9/production/manual/auth-forgot-password-invalid-redirect.png`, `output/playwright/st-9/production/manual/auth-forgot-password-invalid-redirect-postdeploy.png` |
| Reset email sent screen | salesman | `/auth/reset-email-sent` | password-reset trigger | Not run | Not run with blocker | Blocked on 2026-04-17 because the forgot-password trigger failed in production and never navigated to `/auth/reset-email-sent`. Post-deploy re-test against Cloudflare version `c4179e4c-dee7-43a8-8077-a686480e67cb` remained blocked because the trigger still returned `403`. |
| Reset password via `code` | salesman | `/auth/reset-password?code=...` | valid reset code | Not run | Not run with blocker | Blocked on 2026-04-17 pending a fresh valid reset code; production forgot-password currently fails before any reset email can be sent |
| Reset password via `token` | salesman | `/auth/reset-password?token=...` | valid reset token | Not run | Not run with blocker | Blocked on 2026-04-17 pending a fresh valid reset token; production forgot-password currently fails before any reset email can be sent |
| Reset password via email + OTP | salesman | `/auth/reset-password` email + otp flow | valid reset email and otp | Not run | Not run with blocker | Blocked on 2026-04-17 pending a reset email and OTP; production forgot-password currently fails before any reset email can be sent |
| Reset success screen | salesman | `/auth/reset-success` | successful reset | Not run | Not run with blocker | Blocked on 2026-04-17 because none of the password-reset entry paths could be completed in production |
| Accept invite | salesman | `/auth/accept-invite?token=...` | valid pending invite | Not run | Pass | Post-deploy re-test on 2026-04-17 after Cloudflare version `c4179e4c-dee7-43a8-8077-a686480e67cb` opened a fresh pending invite and correctly landed on `/auth/reset-password?email=inbox%2Bstaffrerun%40ohthatgrp.com`, rendering the reset form instead of dead-ending on `/auth/reset-email-sent`. Artifacts: `output/playwright/st-9/production/manual/staff-invite-email-staff-rerun.eml`, `output/playwright/st-9/production/manual/auth-accept-invite-reset-password-postdeploy.png` |
| Invite already used state | operator | `/auth/accept-invite?token=...` | accepted invite token | Not run | Pass | Opening an already-accepted production invite rendered `Invite Already Used` with the expected recovery copy and `Back to Admin Sign In` link. Artifact: `output/playwright/st-9/production/manual/auth-invite-already-used.png` |
| Invite revoked state | operator | `/auth/accept-invite?token=...` | revoked invite token | Not run | Pass | Opening a revoked production invite rendered `Invite Revoked` with the expected guidance to ask for a new invite and the fallback link back to `/auth/login`. Artifact: `output/playwright/st-9/production/manual/auth-invite-revoked.png` |
| Invite disabled-account state | operator | `/auth/accept-invite?token=...` | disabled invited profile | Not run | Pass | With the pending invited `Staff Rerun` profile temporarily disabled, opening its production invite rendered `Account Disabled` with the expected guidance and fallback link to `/auth/login`; the profile was then restored. Artifact: `output/playwright/st-9/production/manual/auth-invite-disabled.png` |
| Invalid invite state | operator | `/auth/accept-invite?token=...` | invalid or missing invite token | Not run | Pass | Production rendered `Invite Link Invalid` with the expected recovery link back to `/auth/login`. Artifact: `output/playwright/st-9/production/manual/auth-invalid-invite.png` |
| Post-login redirect | salesman | `/auth/post-login` | active admin session | Not run | Pass | Active production admin session redirected from `/auth/post-login` back to `/admin/dashboard`. Artifact: `output/playwright/st-9/production/manual/auth-post-login-redirect.png` |
| Wrong-role state | operator | direct auth-route access | customer bearer link or non-admin profile | Not run | Pass | Verified by temporarily switching the active admin profile role to `customer`, loading `/auth/post-login`, observing redirect to `/auth/login?error=admin_only`, then restoring the role. Artifact: `output/playwright/st-9/production/manual/auth-wrong-role-admin-only.png` |
| Disabled-admin state | operator | `/auth/login` | disabled salesman profile | Not run | Pass | Verified by temporarily setting `disabled_at` on the active admin profile, loading `/auth/post-login`, observing redirect to `/auth/login?error=admin_disabled`, then restoring the profile. Artifact: `output/playwright/st-9/production/manual/auth-admin-disabled.png` |
| Profile-missing state | operator | `/auth/post-login` | Supabase auth user without app profile | Not run | Not run with blocker | Blocked on 2026-04-17 because production lacks a safe auth user without an app profile; attempted salesman-profile orphaning self-healed via `markPendingStaffInvitesAccepted` and did not produce a missing-profile redirect |
| Auth callback failed state | operator | `/auth/login?error=auth_callback_failed` | failed auth code exchange | Not run | Pass | Production rendered the expected callback-failure banner on `/auth/login`. Artifact: `output/playwright/st-9/production/manual/auth-callback-failed-state.png` |

### Staff Management

| Flow | Audience | Entrypoint / trigger | Required fixture | Preview | Production | Artifact / note |
| --- | --- | --- | --- | --- | --- | --- |
| Staff page load | salesman | `/admin/staff` | active admin session | Not run | Fail | Route rendered, but the production staff page emitted React error `#418` in the browser console. Artifact: `output/playwright/st-9/production/manual/admin-staff-react-418.png` |
| Copy invite URL | salesman | pending invite row action | pending invite | Not run | Pass | Copied pending invite URL from production staff row and captured the exact deployed link: `https://universal-beverage-app.inbox-23c.workers.dev/auth/accept-invite?token=89d7592e-5b7f-4199-a4b1-012b1c957dd8...`; action ran on a page with a separate staff-route React `#418` defect already logged |
| Create or update invite | salesman | `/admin/staff` create form | deliverable invite email | Not run | Pass | Submitted the create form with existing `Staff Rerun` identity details; production `POST /api/admin/staff => 201`, the row stayed `invited`, and the last-invite value advanced to `Apr 17, 2026, 11:08 AM`. Neon kept invite `56c44bfd-da87-4d74-a713-2e2b623269db` in `pending` with `updated_at = 2026-04-17T15:08:54.924Z`. Artifact: `output/playwright/st-9/production/manual/admin-staff-create-form-rerun.png` |
| Resend invite | salesman | invite row action | pending invite | Not run | Pass | Production `POST /api/admin/staff/44755de5-3786-4f10-baa3-382e106cf72f/invite => 200`; the staff row updated to `Apr 17, 2026, 10:56 AM`, and Neon moved invite `89d7592e-5b7f-4199-a4b1-012b1c957dd8` to `updated_at = 2026-04-17T14:56:16.613Z` |
| Revoke invite | salesman | invite row action | pending invite | Not run | Fail | Production `POST /api/admin/staff/44755de5-3786-4f10-baa3-382e106cf72f/revoke => 200`, and Neon marked invite `89d7592e-5b7f-4199-a4b1-012b1c957dd8` as `revoked` at `2026-04-17T14:57:01.649Z`, but the staff row stayed stale as `invited` until a full reload. Artifact: `output/playwright/st-9/production/manual/admin-staff-revoke-stale.png` |
| Disable salesman | salesman | row action | invited/active salesman | Not run | Pass | Production `POST /api/admin/staff/44755de5-3786-4f10-baa3-382e106cf72f/disable => 200`; the `Staff Test` row flipped to `disabled` with an `Enable` action, and Neon set `disabled_at = 2026-04-17T15:01:11.091Z`. Artifact: `output/playwright/st-9/production/manual/admin-staff-disabled-row.png` |
| Re-enable salesman | salesman | row action | disabled salesman | Not run | Pass | The `Enable` action restored `Staff Test` to `active` in the table, and Neon cleared `disabled_at` back to `null`. Browser network reused the toggle-style `POST /api/admin/staff/44755de5-3786-4f10-baa3-382e106cf72f/disable => 200` route, which matches the shipped API shape. Artifact: `output/playwright/st-9/production/manual/admin-staff-reenabled-row.png` |
| Accepted invite to successful sign-in | salesman | invite email -> reset -> login | deliverable invite email | Not run | Fail | Post-deploy re-test after Cloudflare version `c4179e4c-dee7-43a8-8077-a686480e67cb` now reaches `/auth/reset-password?email=...`, but manual inbox verification confirmed no follow-up reset/setup email arrived for `inbox+staffrerun@ohthatgrp.com`, so the invited salesman still cannot complete password setup or first sign-in. Artifacts: `output/playwright/st-9/production/manual/staff-invite-email-staff-rerun.eml`, `output/playwright/st-9/production/manual/auth-accept-invite-reset-password-postdeploy.png` |

### Admin Surfaces

| Flow | Audience | Entrypoint / trigger | Required fixture | Preview | Production | Artifact / note |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard load | salesman | `/admin/dashboard` | active admin session | Not run | Pass | Manual production check; route rendered cleanly. Artifact: `output/playwright/st-9/production/manual/dashboard-after-login.png` |
| Dashboard stat-card drilldowns and order search/filter | salesman | `/admin/dashboard` dashboard controls | active admin session + seeded orders | Not run | Pass | Production dashboard cards navigated to the expected routes: `Orders Today -> ?deliveryDate=2026-04-17`, `Pending Review -> ?status=submitted`, `Customers -> /admin/customers`, `Products -> /admin/catalog`, `Pallets -> /admin/catalog/pallets`. Filling the search box with `Portal Persistent` updated the URL to `?status=submitted&q=Portal+Persistent` and narrowed the table to the matching submitted order. Artifact: `output/playwright/st-9/production/manual/admin-dashboard-drilldowns-search.png` |
| Draft order creation with inline customer create | salesman | `/admin/dashboard` new draft flow | active admin session + catalog | Not run | Pass | The modal `New Customer` branch created customer `ST9 Inline Draft Customer 1519` (`eb72c95a-7738-4c1a-a448-49dbad9ab243`) and draft order `b576ff7c-f4d8-4e24-8ccb-239b83414392`, then redirected to `/admin/orders/b576ff7c-f4d8-4e24-8ccb-239b83414392?returnTo=%2Fadmin%2Fdashboard`. Browser network showed `POST /api/customers => 201` and `POST /api/orders => 201`; Neon confirmed the new customer token and draft order. Artifact: `output/playwright/st-9/production/manual/admin-new-draft-inline-customer.png` |
| Dashboard inline order status change | salesman | dashboard order row action | seeded draft/submitted orders | Not run | Fail | Valid dashboard restore to `Draft` passed, but draft rows still expose illegal `Delivered` and the write fails with `409`. Artifact: `output/playwright/st-9/production/manual/admin-dashboard-invalid-delivered-option.png` |
| Dashboard bulk order update/delete | salesman | dashboard bulk actions | selectable order rows | Not run | Fail | Using disposable order `b576ff7c-f4d8-4e24-8ccb-239b83414392`, production bulk `Mark Submitted` and bulk `Delete` both returned `200` and mutated Neon, but the dashboard stayed stale: it still rendered `Draft` immediately after submit, and after delete it still showed the now-removed order row until another refresh cycle. Artifact: `output/playwright/st-9/production/manual/admin-dashboard-bulk-stale-after-delete.png` |
| Dashboard order CSV download and customer deep link copy | salesman | dashboard row actions | seeded order data | Not run | Pass | On production dashboard row `Portal Persistent Customer`, `Copy customer portal order link` copied `https://universal-beverage-app.inbox-23c.workers.dev/portal/b3e18c48f8f6880831382e71558deefc/order/link/84ca09eb-c191-4069-8df7-866d1625d9db`, and `Download CSV` downloaded `order-84ca09eb-c191-4069-8df7-866d1625d9db.csv` with real line-item content. Artifact: `output/playwright/st-9/production/manual/order-84ca09eb-c191-4069-8df7-866d1625d9db.csv` |
| Customers list search/add/open-detail | salesman | `/admin/customers` | imported customer rows | Not run | Fail | List search and row-open worked: searching `ST9 Inline Draft Customer 1519` updated the URL to `?q=...` and narrowed the table, and clicking the row opened `/admin/customers/eb72c95a-7738-4c1a-a448-49dbad9ab243`. But the top-level `Add Customer` form failed with `POST /admin/customers => 307`, then `/auth/login => 200`, and the page fell into the generic error boundary without creating a customer. Artifact: `output/playwright/st-9/production/manual/admin-customers-add-error.png` |
| Customer detail view and settings save | salesman | `/admin/customers/[id]` | existing customer profile | Not run | Fail | Detail rendered, but `Save` hit the generic error boundary and no profile write persisted. Artifact: `output/playwright/st-9/production/manual/admin-customer-save-error.png` |
| Customer bulk delete | salesman | customers bulk action | selectable customer rows | Not run | Fail | Using disposable customer `eb72c95a-7738-4c1a-a448-49dbad9ab243`, production `POST /api/admin/customers/bulk => 200` removed the profile in Neon, but the filtered customers list still rendered the deleted row until another refresh cycle. Artifact: `output/playwright/st-9/production/manual/admin-customers-bulk-delete-stale.png` |
| Customer portal link copy | salesman | customer detail/action | customer with token | Not run | Pass | On production `/admin/customers`, the `Portal Persistent Customer` row `Copy URL` action copied `https://universal-beverage-app.inbox-23c.workers.dev/portal/b3e18c48f8f6880831382e71558deefc` from the browser clipboard. |
| Customer portal link regenerate | salesman | customer action | customer with token | Not run | Pass | On production `/admin/customers/67160389-13f6-413d-b399-1bc91525551e`, clicking `Regenerate Token` returned `POST /api/customers/67160389-13f6-413d-b399-1bc91525551e/regenerate-token => 200`, updated the visible portal URL from `/portal/8dfa2272d3de033e1a7adc1d8aef3285` to `/portal/c899ee7d36bf86a1847961b3ba9ae68f`, and Neon confirmed the profile `access_token` changed to the new value. Artifact: `output/playwright/st-9/production/.playwright-cli/page-2026-04-17T15-33-26-855Z.yml` |
| Customer product visibility and pricing overrides | salesman | `/admin/customers/[id]/products` | customer + products | Not run | Pass | On production customer-products for `ST9 Customer Token Fixture 1532`, a safe Neon fixture toggle enabled `custom_pricing` for the row, search narrowed the table to `COKE CLASSIC`, entering `21.75` surfaced the unsaved-price bar and `Discard` reset it, `Save Changes` issued `PATCH /api/customers/67160389-13f6-413d-b399-1bc91525551e/products => 200`, and toggling `Hide` issued `PUT .../products => 200`. Neon then showed `customer_products(excluded = true, custom_price = 21.75)` for product `6d33385e-1aab-40bd-b9b2-ca23f5825ebd`; the fixture was restored by deleting that override row and resetting `custom_pricing = false`. Artifacts: `output/playwright/st-9/production/manual/admin-customer-products-price-hide-pass.png`, `output/playwright/st-9/production/.playwright-cli/page-2026-04-17T15-39-28-675Z.yml` |
| Customer-only product creation | salesman | `/admin/customers/[id]/products` create action | customer + product fixture | Not run | Pass | On production customer-products for `ST9 Customer Token Fixture 1532`, `Add Custom Product` created `ST9 Customer Only Product 1543` with `pack_details = 1/TEST PACK` and `price = 12.34`. Browser network showed `POST /api/customers/67160389-13f6-413d-b399-1bc91525551e/products => 201`, the new row rendered immediately under `Other Products` with the `Custom` badge, and Neon confirmed product `510984c7-98b7-4cac-bad6-14cce71c465a` with `customer_id = 67160389-13f6-413d-b399-1bc91525551e`. The disposable product was then deleted in Neon and the page reloaded to baseline. Artifact: `output/playwright/st-9/production/manual/admin-customer-products-create-custom-pass.png` |
| Catalog search/list/detail | salesman | `/admin/catalog` | imported catalog | Not run | Pass | Production catalog search narrowed the list to `COKE CLASSIC`, updated the URL to `/admin/catalog?q=COKE+CLASSIC`, and left the table with the matching row only. Opening that row navigated to `/admin/catalog/6d33385e-1aab-40bd-b9b2-ca23f5825ebd`, where the full detail form rendered with the expected brand, pack, size, price, image upload, tags, and status controls. Artifact: `output/playwright/st-9/production/manual/admin-catalog-search-detail-pass.png` |
| Catalog product create with inline brand/size unit create | salesman | catalog create form | catalog + brand + size fixtures | Not run | Fail | On production `/admin/catalog`, using `+ Create new brand` and `+ Create new size unit` with `ST9 Catalog Brand 1547`, `ST9 Catalog Product 1547`, `pack_count = 1`, `size_value = 1`, `size_uom = CASE`, and `price = 9.99` left the form in place with `Unexpected server error`. Browser network showed `POST /api/admin/brands => 201` followed by `POST /api/admin/products => 500`; Neon confirmed the new brand row persisted while no product row was created, so the flow is broken and non-atomic. The orphan brand was deleted immediately after verification. Artifact: `output/playwright/st-9/production/manual/admin-catalog-create-inline-error.png` |
| Catalog reorder and bulk delete | salesman | catalog list actions | selectable product rows | Not run | Fail | On production `/admin/catalog`, both bulk reorder and bulk delete hit `POST /api/admin/products/bulk => 200` and mutated Neon, but the catalog list stayed stale until a full reload. Moving `ST9 Catalog Reorder A 1551` to position `2` left `A` visibly above `B` even though Neon reordered `B` ahead of `A`, and deleting both disposable rows left them visible in the table until reload even though Neon had already removed them. Artifacts: `output/playwright/st-9/production/manual/admin-catalog-reorder-stale.png`, `output/playwright/st-9/production/manual/admin-catalog-bulk-delete-stale.png` |
| Pallet deals list/detail/configuration | salesman | `/admin/catalog/pallets` | pallet deal data | Not run | Fail | Production list and detail rendered, and deal contents include/remove worked through `PUT /api/admin/pallet-deals/6dd87efd-08ce-4284-bb58-4f596515f3ca/items => 200`, but `Save Deal` did not persist configuration changes. Saving edited title/price/savings/description/active values posted to `/admin/catalog/pallets/6dd87efd-08ce-4284-bb58-4f596515f3ca => 307`, then `/auth/login => 200`, logged `Error: An unexpected response was received from the server.`, and Neon kept the original pallet row unchanged. Artifact: `output/playwright/st-9/production/manual/admin-pallet-settings-noop.png` |
| Brands search/create/edit/delete | salesman | `/admin/brands` | brand data | Not run | Fail | Search narrowed to `?q=Pepsi`, disposable brand `ST9 Brand 1616` was created, renamed to `ST9 Brand 1616 Edited`, then deleted through `POST/PATCH/DELETE /api/admin/brands... => 201/200/200` with Neon confirming create/edit/delete and full restore. But the page still renders Coca-Cola's logo from the retired Supabase host and emits `net::ERR_NAME_NOT_RESOLVED` on load. Artifacts: `output/playwright/st-9/production/manual/admin-brands-stale-logo-host.png`, `output/playwright/st-9/production/manual/admin-brands-stale-logo-host-console.log` |
| Orders alias redirect behavior | salesman | `/admin/orders` | preserved dashboard filter query | Not run | Pass | Production redirect preserved dashboard filter query and returned to `/admin/dashboard` |
| Order detail view and lifecycle actions | salesman | `/admin/orders/[id]` | seeded order data | Not run | Fail | Detail rendered, but `Draft -> Submitted` stayed stale on-page and `Mark Delivered` failed with the generic error boundary. Artifacts: `output/playwright/st-9/production/manual/admin-order-detail-stale-after-submit.png`, `output/playwright/st-9/production/manual/admin-order-detail-mark-delivered-error.png` |
| Reports run and summary inspection | salesman | `/admin/reports` | reportable data | Not run | Pass | Running `/admin/reports?from=2026-04-17&to=2026-04-17` produced `Orders = 4`, `Revenue = $114.00`, and `Items Sold = 4`, with four draft order summaries and `CHERRY COKE / Coca-Cola` as the top product at `$114.00` and `4 sold`. Neon aggregates for the same date matched exactly. Artifact: `output/playwright/st-9/production/manual/admin-reports-2026-04-17-pass.png` |

### Customer Portal

| Flow | Audience | Entrypoint / trigger | Required fixture | Preview | Production | Artifact / note |
| --- | --- | --- | --- | --- | --- | --- |
| Portal home render and order visibility | customer | `/portal/[token]` | valid customer token | Not run | Fail | Home rendered usable order data, but production console emitted React error `#418`. Artifact: `output/playwright/st-9/production/manual/portal-home-matrix.png` |
| Draft creation | customer | new-order action | valid customer token | Not run | Pass | On production portal token `59218d66ba1b9663f083b1b7f9f111af`, changing the date to `2026-04-18` and clicking `+ New Order` returned `POST /api/portal/orders => 201` and opened `/portal/59218d66ba1b9663f083b1b7f9f111af/order/link/28823b2f-01b6-4b29-977f-d19e0b10c1b5`. Neon confirmed the new draft for customer `e4c24180-950d-423c-aaff-71d10d69424c` with `delivery_date = 2026-04-18`, `status = draft`, `total = 0.00`, and `item_count = 0`. Artifact: `output/playwright/st-9/production/manual/portal-draft-created-2026-04-18.png` |
| Order builder search/filter/grouping/new-items/section toggles | customer | `/portal/[token]/order/[date]` product controls | draft order + products | Not run | Pass | On new draft `28823b2f-01b6-4b29-977f-d19e0b10c1b5` for `2026-04-18`, the builder collapsed `New Items`, expanded the `Coca-Cola` section, searched `CHERRY COKE`, filtered to `Brand = Coca-Cola` and `Size = 20 OZ`, then switched `Group = Size`. The filtered results and inline brand-logo size view updated immediately. The stale Coca-Cola logo host still emits browser errors on this surface, but that asset defect is tracked separately under uploaded-asset rendering. Artifact: `output/playwright/st-9/production/manual/portal-builder-filters-grouping-2026-04-18.png` |
| Order builder pallet-deal selection and mixed-pallet quantities | customer | `/portal/[token]/order/[date]` pallet mode | draft order + pallet deal data | Not run | Pass | On draft `28823b2f-01b6-4b29-977f-d19e0b10c1b5`, `Save With Pallets` opened pallet mode, `Single Pallets` allowed selecting `New Pallet Deal`, and `Mixed Pallets` allowed incrementing `COKE CLASSIC PALLET` to quantity `1`. Browser network issued two `PUT /api/portal/orders/28823b2f-01b6-4b29-977f-d19e0b10c1b5/items => 200` writes, and Neon showed matching single + mixed pallet order-items. Artifact: `output/playwright/st-9/production/manual/portal-pallet-mode-2026-04-18.png` |
| Autosave item add/update | customer | order builder | draft order + products | Not run | Pass | Quantity changes `1 -> 2 -> 1` succeeded in UI and Neon. Artifact: `output/playwright/st-9/production/manual/portal-draft-qty-2.png` |
| Remove item | customer | order builder quantity to zero | draft order with item | Not run | Pass | On draft `28823b2f-01b6-4b29-977f-d19e0b10c1b5`, decreasing mixed pallet `COKE CLASSIC PALLET` from quantity `1` back to `0` returned `DELETE /api/portal/orders/28823b2f-01b6-4b29-977f-d19e0b10c1b5/items => 200`, removed that row from Neon, and dropped the review sidebar from `2 items / $1,560.01` to the remaining single pallet only. Artifact: `output/playwright/st-9/production/manual/portal-remove-mixed-pallet-2026-04-18.png` |
| Order review sidebar/sheet and reset all | customer | order builder review/reset controls | draft order with items | Not run | Fail | On draft `28823b2f-01b6-4b29-977f-d19e0b10c1b5`, the mobile `Review Order` sheet opened, showed the single-pallet summary, and `Reset All` returned `DELETE /api/portal/orders/28823b2f-01b6-4b29-977f-d19e0b10c1b5/items/all => 200`, leaving the draft empty in Neon. But opening the sheet emitted dialog accessibility errors for missing `DialogTitle` and `Description`, so the row cannot pass. Artifacts: `output/playwright/st-9/production/manual/portal-review-sheet-resetall-2026-04-18.png`, `output/playwright/st-9/production/manual/portal-review-sheet-console.log` |
| Submit order | customer | draft order submit action | draft order with item | Not run | Pass | `PATCH /api/portal/orders/[id]/status` returned `200`; Neon moved the order to `submitted`. Artifact: `output/playwright/st-9/production/manual/portal-home-submitted.png` |
| Cancel back to draft | customer | submitted order cancel | submitted order | Not run | Fail | Backend reverted the order to `draft`, but portal home stayed stale and still showed `Submitted`. Artifact: `output/playwright/st-9/production/manual/portal-home-stale-after-cancel.png` |
| Readonly order view | customer | `/portal/[token]/order/link/[id]` | submitted or delivered order | Not run | Pass | Readonly production order route rendered cleanly. Artifact: `output/playwright/st-9/production/manual/portal-order-delivered-matrix.png` |
| Reorder / clone | customer | orders/history action | delivered order | Not run | Pass | On portal home, the delivered `Apr 15, 2026` row opened the `Reorder` dialog, shifting the target date to `Apr 19, 2026` and clicking `Clone Order` returned `POST /api/portal/orders/d5659180-d4c5-4bfb-a540-8d34bb677bd6/clone => 201`, then opened new draft `/portal/59218d66ba1b9663f083b1b7f9f111af/order/link/755e74c8-ea4f-467f-9913-95334fe91598` with the copied line item. Neon confirmed the cloned draft and item, and the disposable Apr 19 clone was then deleted to restore baseline. Artifact: `output/playwright/st-9/production/manual/portal-reorder-clone-2026-04-19.png` |
| CSV export | customer | order export action | order with items | Not run | Pass | On portal home, clicking the delivered `Apr 15, 2026` row export action triggered `GET /api/portal/orders/d5659180-d4c5-4bfb-a540-8d34bb677bd6/csv?token=59218d66ba1b9663f083b1b7f9f111af => 200` and downloaded `order-d5659180-d4c5-4bfb-a540-8d34bb677bd6.csv` with the expected line item `Coca-Cola - CHERRY COKE - 20 OZ,24/20 OZ.,1,28.50,28.50`. Artifact: `output/playwright/st-9/production/manual/order-d5659180-d4c5-4bfb-a540-8d34bb677bd6.csv` |
| Account/profile update | customer | `/portal/[token]/account` | customer profile | Not run | Pass | Profile update and restore both succeeded with `PATCH /api/portal/profile => 200`. Artifact: `output/playwright/st-9/production/manual/portal-account-matrix.png` |
| Orders alias redirect behavior | customer | `/portal/[token]/orders` | valid customer token | Not run | Pass | Production alias redirected back to canonical portal home |
| Invalid token not-found behavior | customer | `/portal/[bad-token]/*` | invalid customer token | Not run | Pass | Browser showed the correct `404`; observability noise is tracked separately in `output/playwright/st-9/production/defects.md`. Artifact: `output/playwright/st-9/production/manual/portal-invalid-token.png` |
| Legacy `/c/[token]/*` redirect behavior | customer | old copied link | valid customer token | Not run | Pass | Legacy customer route redirected to the canonical `/portal/[token]` surface |

### Uploads and Assets

| Flow | Audience | Entrypoint / trigger | Required fixture | Preview | Production | Artifact / note |
| --- | --- | --- | --- | --- | --- | --- |
| Admin asset upload success | salesman | admin upload UI | valid product image, brand logo, and pallet asset files | Not run | Fail | Product and pallet upload widgets accepted valid images and rendered previews with `POST /api/uploads => 201`, but the brand-manager create flow immediately rejected the uploader's returned relative logo URL with `POST /api/admin/brands => 400` and `Invalid request payload`. Artifacts: `output/playwright/st-9/production/manual/admin-product-upload-success.png`, `output/playwright/st-9/production/manual/admin-brand-upload-invalid-payload.png` |
| Invalid file rejection | salesman | admin upload UI | invalid file type | Not run | Pass | On production product detail, uploading `st9-upload-invalid.txt` returned `POST /api/uploads => 400` and surfaced `Unsupported file type. Allowed: image/jpeg, image/png, image/webp, image/gif, image/svg+xml` inline on the shared uploader. Artifacts: `output/playwright/st-9/production/manual/admin-upload-invalid-type-product.png`, `output/playwright/st-9/production/manual/admin-upload-invalid-type-product-console.log` |
| Oversize rejection | salesman | admin upload UI | file > size limit | Not run | Pass | On production product detail, uploading `st9-upload-oversize.png` returned `POST /api/uploads => 400` and surfaced `File size must be under 5 MB` inline on the shared uploader. Artifacts: `output/playwright/st-9/production/manual/admin-upload-oversize-product.png`, `output/playwright/st-9/production/manual/admin-upload-oversize-product-console.log` |
| Uploaded asset render | salesman/customer | page using uploaded asset | uploaded asset URL | Not run | Fail | Portal draft still rendered a retired Supabase storage host, so brand imagery failed to resolve. Artifact: `output/playwright/st-9/production/manual/portal-draft-order-matrix.png` |

### Emails and Share Touchpoints

| Flow | Audience | Entrypoint / trigger | Required fixture | Preview | Production | Artifact / note |
| --- | --- | --- | --- | --- | --- | --- |
| Staff invite email | salesman/operator | `/admin/staff` invite send | deliverable inbox | Not run | Pass | Manual evidence from `output/playwright/st-9/production/manual/staff-invite-email-staff-rerun.eml`: sender `mail@unibev.ohthatgrp.com`, subject `Set up your Universal Beverages admin access`, CTA label `Open your admin invite`, and CTA target uses the deployed production domain `https://universal-beverage-app.inbox-23c.workers.dev/auth/accept-invite?...` |
| Admin password setup email | salesman/operator | invite acceptance | deliverable inbox | Not run | Fail | Manual inbox verification on 2026-04-17 found no followup password-setup email after clicking the invite CTA. Post-deploy re-test after Cloudflare version `c4179e4c-dee7-43a8-8077-a686480e67cb` fixed the landing route to `/auth/reset-password?email=...`, but the invited mailbox still received no follow-up reset/setup email, so the downstream onboarding path remains broken. Artifacts: `output/playwright/st-9/production/manual/auth-accept-invite-reset-email-sent.png`, `output/playwright/st-9/production/manual/auth-accept-invite-reset-password-postdeploy.png` |
| Admin password reset email | salesman/operator | forgot-password | deliverable inbox | Not run | Not run with blocker | Manual; blocked on 2026-04-17 because the forgot-password trigger failed with `Invalid redirectURL` before any reset email was sent. Post-deploy re-test against Cloudflare version `c4179e4c-dee7-43a8-8077-a686480e67cb` remained blocked because the trigger still returned `403`. |
| Customer portal access-link share/copy | salesman/customer | customer share surface | customer with token | Not run | Pass | On production customer detail, the `Portal Link` card said `Share this permanent link with the customer. They can create orders and view history without logging in.` and rendered the copied bearer URL on the deployed domain `https://universal-beverage-app.inbox-23c.workers.dev/portal/...`. Artifacts: `output/playwright/st-9/production/manual/admin-customer-portal-link-wording.png`, existing clipboard evidence in `output/playwright/st-9/production/live-mutations.md` section 26 |
| Deployed-domain CTA correctness | operator | every shipped email/share CTA | deployed URLs | Not run | Not run with blocker | The invite email CTA and copied customer/order links use the deployed production domain, and the post-deploy invite handoff also stayed on `https://universal-beverage-app.inbox-23c.workers.dev/auth/reset-password?...`. Complete auth-email CTA coverage is still blocked because the password-setup email never arrived and forgot-password still emits no reset email. Artifacts: `output/playwright/st-9/production/manual/staff-invite-email-staff-rerun.eml`, `output/playwright/st-9/production/manual/auth-accept-invite-reset-password-postdeploy.png`, `output/playwright/st-9/production/manual/admin-customer-portal-link-wording.png` |
| Key operator screen visual/copy correctness | operator | admin dashboard/customers/catalog/staff surfaces | stable deployed data | Not run | Pass | Manual review of the captured production dashboard, customers, catalog, and staff surfaces found clear headings, labels, and operator-facing copy. Functional defects on those routes remain tracked separately and do not indicate additional copy issues. Artifacts: `output/playwright/st-9/production/manual/dashboard-after-login.png`, `output/playwright/st-9/production/manual/admin-customers.png`, `output/playwright/st-9/production/manual/admin-catalog-search-detail-pass.png`, `output/playwright/st-9/production/manual/admin-staff.png` |

### Runtime and Environment Touchpoints

| Flow | Audience | Entrypoint / trigger | Required fixture | Preview | Production | Artifact / note |
| --- | --- | --- | --- | --- | --- | --- |
| Preview URL behavior | operator | preview deployed URL | preview deploy live | Not run | N/A | |
| Production URL behavior | operator | production deployed URL | production deploy live | N/A | Pass | Production deploy was live and routable on 2026-04-16 through 2026-04-17; row-level failures are tracked above |
| Admin session persistence | salesman | post-login navigation | active admin session | Not run | Pass | The same admin session held across dashboard, staff, customers, catalog, pallets, reports, and order-detail navigation |
| Bearer-link access without auth session | customer | direct `/portal/[token]` open | valid customer token | Not run | Pass | Direct token routes worked as bearer-link access without requiring an admin auth session |
| No local-only host leakage | operator | inspect CTA/copy/redirects | deployed URLs | Not run | Pass | Production invite/share/copy artifacts used `https://universal-beverage-app.inbox-23c.workers.dev/...`, and a text search across the captured production artifacts found no `localhost`, `127.0.0.1`, or `:3000` leakage. Artifacts: `output/playwright/st-9/production/manual/staff-invite-email-staff-rerun.eml`, `output/playwright/st-9/production/manual/admin-customer-portal-link-wording.png` |

## Completion Rule

`ST-9` is complete only when:

- every supported flow in this matrix has a recorded result
- no `fail` remains open
- any `not run with blocker` is explicitly accepted as a blocker or out-of-scope decision
- preview and production results are both recorded
- the matrix still matches `docs/st-9-application-flow-inventory.md`
