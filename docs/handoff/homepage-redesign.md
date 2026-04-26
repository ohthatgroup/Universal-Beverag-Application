# Homepage Redesign — Engineering Handoff

This document tracks every mock, `// TODO`, and placeholder shipped in the
homepage extension + admin announcements design pass (spec at
[`docs/superpowers/specs/2026-04-25-homepage-and-navbar-design.md`](../superpowers/specs/2026-04-25-homepage-and-navbar-design.md)).
Every entry needs a backend follow-up before the surface goes to production —
a missing entry means a silently broken feature.

## Summary

| # | File | What to replace | Blocked on |
|---|------|-----------------|------------|
| 1 | `app/(portal)/portal/[token]/page.tsx` | `MOCK_ANNOUNCEMENTS` | `announcements` table migration + `GET /api/portal/announcements` (or RSC db.query) |
| 2 | `app/(portal)/portal/[token]/page.tsx` | `MOCK_STATS` | account stats query in RSC (cases / spend / orders this month) |
| 3 | `app/(admin)/admin/announcements/page.tsx` | `MOCK_ANNOUNCEMENTS` (admin) | RSC `db.query` against `announcements` |
| 4 | `app/(admin)/admin/customers/[id]/homepage/page.tsx` | mock `customerName` | RSC `db.query` against `profiles` |
| 5 | `components/admin/announcements-manager.tsx` | reorder / toggle / delete / save are local-only | `POST/PATCH/DELETE /api/admin/announcements/[id]` |
| 6 | `components/admin/customer-homepage-manager.tsx` | `MOCK_GLOBAL_DEALS`, `MOCK_GLOBAL_ANNOUNCEMENTS`, `MOCK_CUSTOM_ANNOUNCEMENTS` | per-customer queries + `POST /api/admin/customers/[id]/announcements` |
| 7 | `components/admin/announcement-dialog.tsx` | plain-text `Input` for `product_id` and `product_ids` | searchable product select component |
| 8 | `components/admin/announcement-dialog.tsx` | plain-text `Input` for `image_url` | swap to `<ImageUploadField>` once upload bucket is wired |
| 9 | `components/portal/announcement-card.tsx` | `ProductSpotlightCard` "Add to order" with no draft fires `window.alert` | replace with `<Panel variant="bottom-sheet">` date-picker per spec |
| 10 | `components/portal/announcement-card.tsx` | `SpecialsGridCard` autosave is local-only | wire `useAutoSavePortal` once `primaryDraftOrderId` flow is integrated |
| 11 | `app/(portal)/portal/[token]/page.tsx` | `nextNextDeliveryDate` mocked as `addDays(nextDeliveryDate, 7)` | cutoff-aware delivery-date utility (skip weekends/holidays/cutoffs) |
| 12 | `components/portal/start-order-fork.tsx` | path-tap handlers fire `window.alert` | `clone_order(source, new_date)` for Reorder; "compute usuals" SQL helper for Usuals; existing draft-create endpoint for Scratch |
| 13 | `components/portal/start-order-fork.tsx` | confirm-replace dialog only fires the same `window.alert` | atomic swap-draft-contents endpoint (e.g., `delete_order_items` + `clone_order` in one tx) |
| 14 | `components/portal/reorder-list.tsx` | `OrderPreviewSheet` shows hardcoded `getMockPreviewItems` line items | `GET /api/portal/orders/[id]/items` (or RSC fetch) to load real items per preview |
| 15 | `components/portal/start-order-drawer.tsx` | drawer's three actions (clone recent, add usuals, start empty) all `window.alert` | clone_order / apply_usuals / draft-create endpoints (same as entries 12-13) |
| ~~16~~ | ~~`components/portal/manage-usuals-list.tsx`~~ | ~~hardcoded products, local-only toggle~~ | **DONE** — toggle calls `PATCH /api/portal/usuals` with optimistic UI + rollback. |
| ~~17~~ | ~~`app/(portal)/portal/[token]/catalog/page.tsx`~~ | ~~`MOCK_PRODUCTS`~~ | **DONE** — RSC now queries products + customer_products and feeds real shape into `<ManageUsualsList>`. |
| ~~18~~ | ~~`app/(portal)/portal/[token]/layout.tsx`~~ | ~~`MOCK_USUALS_COUNT`~~ | **DONE** — layout queries the count and feeds the drawer. |
| 19 | `components/layout/portal-top-bar.tsx` | inline-SVG wordmark stand-in for the brand logo | drop the real `public/brand/universal-beverages.svg` (or .png) asset and swap to `<Image src="/brand/universal-beverages.svg" />` |

## Entries

### 1. Portal homepage `MOCK_ANNOUNCEMENTS`

- **File:** `app/(portal)/portal/[token]/page.tsx` (top of file)
- **What the UI does now:** Hard-codes one example of each of the five
  `Announcement.content_type` variants and passes them to `<AnnouncementsStack>`.
- **What needs to happen:** Replace with a real query against the
  `announcements` table, joined to `customer_announcements` for per-customer
  overrides, filtered by `is_active`, `starts_at`, `ends_at`, and
  `audience_tags` matching the customer's profile tags.
- **Blocked on:** migration creating `announcements` (and optionally
  `customer_announcements`) tables; agreement on whether the query lives in
  the RSC directly or behind `GET /api/portal/announcements`.

### 2. Portal homepage `MOCK_STATS`

- **File:** `app/(portal)/portal/[token]/page.tsx` (top of file)
- **What the UI does now:** Hard-codes `casesThisMonth: 48`, `spendThisMonth:
  1240`, `ordersThisMonth: 3` and passes them to `<AccountStatsCard>`.
- **What needs to happen:** Compute from `orders` + `order_items` for the
  current month for the resolved `customerId`. Cases = sum of `order_items.quantity`,
  spend = sum of `order_items.line_total`, orders = count of distinct
  submitted/delivered orders.
- **Blocked on:** SQL stats query in the RSC (no schema change required).

### 3. Admin announcements page `MOCK_ANNOUNCEMENTS`

- **File:** `app/(admin)/admin/announcements/page.tsx` line ~7
- **What the UI does now:** Renders four hardcoded announcements covering text /
  image / product / specials_grid types so the manager UI is exercised.
- **What needs to happen:** Replace with `db.query` against `announcements`
  ordered by `sort_order asc`. Handle empty state.
- **Blocked on:** `announcements` table migration.

### 4. Admin customer homepage `customerName`

- **File:** `app/(admin)/admin/customers/[id]/homepage/page.tsx` line ~14
- **What the UI does now:** Hard-codes `'Acme Deli'` as the customer name.
- **What needs to happen:** Resolve the customer from `profiles` by `id`,
  derive a display name (`business_name` ?? `contact_name`).
- **Blocked on:** RSC db query (no schema change).

### 5. AnnouncementsManager mutations are local-only

- **File:** `components/admin/announcements-manager.tsx`
  - `moveRow` line ~64 — `// TODO: wire up PATCH ...sort_order`
  - `toggleActive` line ~75 — `// TODO: wire up PATCH ...is_active`
  - `removeRow` line ~83 — `// TODO: wire up DELETE`
  - `handleSave` line ~118 — `// TODO: wire up POST/PATCH`
- **What the UI does now:** Reorder arrows, the active switch, delete, and
  create/edit save all mutate local React state only. No network calls.
- **What needs to happen:** Wire up:
  - `PATCH /api/admin/announcements/[id]` with `{ sort_order }` after a swap.
  - `PATCH /api/admin/announcements/[id]` with `{ is_active }` for the toggle.
  - `DELETE /api/admin/announcements/[id]` for delete.
  - `POST /api/admin/announcements` for create, `PATCH .../[id]` for edit.
  - Optimistic UI is fine; on error revert local state and surface a toast.
- **Blocked on:** API routes + Zod schemas for the announcement payload.

### 6. CustomerHomepageManager mock data

- **File:** `components/admin/customer-homepage-manager.tsx` lines ~14–24
- **What the UI does now:** Renders three hardcoded constants
  (`MOCK_GLOBAL_DEALS`, `MOCK_GLOBAL_ANNOUNCEMENTS`, `MOCK_CUSTOM_ANNOUNCEMENTS`)
  to populate the deals + announcements sections.
- **What needs to happen:**
  - Pull active pallet deals from the existing `pallet_deals` table.
  - Pull global announcements that match the customer's `audience_tags`.
  - Pull customer-scoped announcements (filter where `audience_tags`
    contains the customer marker, or via a `customer_announcements` join
    table — design choice).
  - Wire the "Hide for this customer" / "Pin a specific deal" / "Add
    announcement" affordances to API routes.
- **Blocked on:** schema decision on per-customer announcement scoping +
  matching API routes.

### 7. AnnouncementDialog plain-text product fields

- **File:** `components/admin/announcement-dialog.tsx`
  - "Product ID" input line ~280 — `// TODO: replace with searchable product select`
  - "Product IDs" input line ~292 — `// TODO: replace with searchable multi-product select`
- **What the UI does now:** Salesman types raw product UUIDs into a plain
  text input. Validation is non-empty only.
- **What needs to happen:** Replace both with a searchable product picker
  that resolves names + thumbnails. The existing admin catalog has the
  query; we likely want to extract a `<ProductSelect>` primitive.
- **Blocked on:** designing/building `<ProductSelect>` (or reusing
  `LiveQueryInput` patterns). No schema change.

### 8. AnnouncementDialog plain-text image URL

- **File:** `components/admin/announcement-dialog.tsx` line ~239
- **What the UI does now:** "Image URL" is a plain text `Input` accepting
  any string.
- **What needs to happen:** Swap for `<ImageUploadField>` (already used in
  catalog) so salesmen can upload directly. Folder name should be
  `announcements`.
- **Blocked on:** confirming the upload bucket is configured for the
  `announcements` folder; otherwise no schema change.

### 9. ProductSpotlightCard "Add to order" with no draft

- **File:** `components/portal/announcement-card.tsx` `handleAddPress` line ~163
- **What the UI does now:** When `primaryDraftOrderId` is null, tapping
  "Add to order" fires a `window.alert` placeholder.
- **What needs to happen:** Replace with a `<Panel variant="bottom-sheet">`
  date picker (mirroring `StartOrderHero` UX) that creates a draft for the
  picked delivery date and then sets the qty to 1.
- **Blocked on:** decision on whether to extract a reusable
  `<PickDeliveryDateSheet>` from `StartOrderHero`. Backend already supports
  draft creation via the existing portal endpoints.

### 10. SpecialsGridCard autosave is local-only

- **File:** `components/portal/announcement-card.tsx` `setQty` line ~245
- **What the UI does now:** Quantity changes for products in a specials grid
  update a local `quantities` map only — no network write.
- **What needs to happen:** Wire `useAutoSavePortal({ orderId:
  primaryDraftOrderId, token })` so quantity changes flow through to the
  draft order, mirroring the rest of the catalog surface.
- **Blocked on:** the `AnnouncementsStack` resolving `resolvedProducts`
  (so we have a real `unitPrice`), and `primaryDraftOrderId` being
  guaranteed non-null at the call site (or wrapped in the same date-picker
  flow as item 9).

### 11. `nextNextDeliveryDate` is a 7-day add

- **File:** `app/(portal)/portal/[token]/page.tsx` line ~187
- **What the UI does now:** When a draft already occupies the next-available
  delivery date, the StartOrderFork's "or start a new order" rows target
  `nextDeliveryDate + 7 days`. There's no awareness of weekends, holidays,
  or product-specific cutoff overrides.
- **What needs to happen:** Replace with a cutoff-aware utility that knows
  the customer's `OrderCutoff` config + `ProductCutoffOverride` rows, and
  returns the correct *next eligible* date after the draft's date.
- **Blocked on:** none — this is a server-side utility in `lib/server/` that
  reads existing tables. Should be extracted from whatever logic the
  `StartOrderHero`'s date-picker uses today (or built fresh if absent).

### 12. StartOrderFork path handlers fire `window.alert`

- **File:** `components/portal/start-order-fork.tsx` `runPath` line ~84
- **What the UI does now:** Tapping "Reorder", "Order your usuals", or
  "Start from scratch" fires a `window.alert` describing what *would*
  happen instead of doing it.
- **What needs to happen:**
  - **Reorder** → call `clone_order(source_order_id, new_delivery_date)`
    (already exists in `db/migrations/`), then redirect to the resulting
    draft via `buildCustomerOrderDeepLink(token, draftId)`.
  - **Usuals** → call a new `apply_usuals_to_draft(customer_id, delivery_date)`
    SQL function (or compose: create empty draft, then bulk-insert
    `order_items` from a "compute usuals" CTE). Redirect to the draft.
  - **Scratch** → call existing `POST /api/portal/orders` with the picked
    delivery date, redirect to the resulting draft (this is what
    `StartOrderHero` does today).
- **Blocked on:** the "compute usuals" SQL helper (Usuals path); everything
  else exists.

### 13a. OrderPreviewSheet line items are mocked

- **File:** `components/portal/reorder-list.tsx` `getMockPreviewItems` line ~140
- **What the UI does now:** When the customer taps the eye-icon Preview
  button on a row in the `<ReorderList>`, the sheet opens with hardcoded
  archetype line items (Coca-Cola, Sprite, Dasani, …) sized to the order's
  `itemCount`.
- **What needs to happen:** Fetch the real line items for the order id —
  either via `GET /api/portal/orders/[id]/items` on sheet-open, or by
  pre-fetching items for `recentOrders` in the homepage RSC and passing
  them in as a prop. Per-open lazy fetch is probably simpler since most
  customers won't preview every row.
- **Blocked on:** none — the items endpoint already exists for the
  readonly order page (`/portal/[token]/order/link/[id]`); reuse the
  same query.

### 13. Confirm-replace dialog doesn't actually replace

- **File:** `components/portal/start-order-fork.tsx` `ConfirmReplaceDialog`
  + `runPath` line ~84
- **What the UI does now:** When a draft exists at the target delivery
  date, the dialog asks the customer to confirm replacement; on confirm
  the code falls through to the same `window.alert` placeholder.
- **What needs to happen:** Add an atomic "swap draft contents" mutation
  that (1) deletes all `order_items` for the existing draft, (2) populates
  it from the chosen path's source (clone last order / apply usuals /
  leave empty for scratch). Should be one transaction; on failure leave
  the draft untouched.
- **Blocked on:** decision on whether to wrap this as a stored function
  (analogous to `clone_order`) or as an API route that runs the steps
  server-side. Either approach needs RLS coverage so customers can only
  swap their own drafts.
