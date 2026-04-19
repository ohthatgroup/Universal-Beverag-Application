# ST-9 Admin Implementation Log

Live tracking of the admin redesign pass. Design-only scope (JSX/CSS); function wiring stubbed per `feedback_design_only_scope.md`.

Preview: http://localhost:3000 (admin login at `/auth/login`)

---

## Status

| # | Job | Status | Notes |
|---|-----|--------|-------|
| 1 | OrderBuilder admin overlay + Present-mode toggle | ✅ done | New component, reused from order detail. |
| 2 | Dashboard reframe (orders-first, stats strip) | ✅ done | 6 stat cards → one-line summary strip; orders list promoted. |
| 3 | Order detail header compression | ✅ done | 7 buttons → `Share with customer` + overflow + Present toggle. |
| 4 | Autosave sweep | ✅ partial | Catalog detail form regrouped (Identity/Pack/Commercial); customer-products sticky save replaced with compact pill banner. Brands autosave = engineer TODO. |
| 5 | Create flows → sheets/dialogs | ✅ partial | Customers: inline form → `NewCustomerDialog` + FAB variant. Catalog/brands: page headers aligned, inline create preserved (full dialog conversion = engineer TODO). |
| 6 | Customers list + detail reorder | ✅ done | Search-dominant index (r3) + name-as-H1 customer home with two big buttons + ledger. Edit form moved to sub-route. |
| 7 | Customer-products pin → star | ✅ done | Already implemented in prior pass. |
| 8 | 3-tab bottom nav + `/admin` drawer (r3) | ✅ done | Reduced 5-tab nav to Customers / Today / Admin. `/admin` is a grouped-list drawer. |
| 9 | Today page rework (r3) | ✅ done | Stats strip + secondary-nav chips removed; "N need review · N drafts" subtitle only. |
| 10 | r4 — top header replaces bottom nav | ✅ done | UB wordmark → Today, Users + Settings icon buttons. `admin-nav.tsx` + `admin-sidebar.tsx` deleted. |
| 11 | r4 — customers index tighten | ✅ done | Dropped `min-h-[70vh]` spacers; recents compressed to `py-2.5`; date meta now `Apr 20 · Draft`. |
| 12 | r4 — customer home one-verb | ✅ done | Share-portal button collapsed into overflow (Copy/Regenerate); Products folded into ledger; orphan edit link removed; back arrow removed. |
| 13 | r4 — Today strip list chrome | ✅ done | Dropped `<h2>Orders</h2>`; New-order → FAB; chips collapsed to `Needs review` / `Drafts`; mobile rows are taps-only with read-only status pill. |
| 14 | r4 — admin drawer flatten | ✅ done | One 5-row card (no section labels); Account email + Sign-out row split into bottom card. |

Feedback captured mid-run:
- `feedback_primary_action_top_right.md` — primary "New X" pinned top-right on all admin list pages.

---

## Files touched

### New (r4)
- `components/layout/admin-top-bar.tsx` — sticky top header: `UB` wordmark → `/admin/dashboard`, plus Users / Settings icon buttons with active-route highlight.

### Deleted (r4)
- `components/layout/admin-nav.tsx` — bottom tab bar removed in favor of top header.
- `components/layout/admin-sidebar.tsx` — desktop sidebar removed; desktop now uses the same top header.

### New
- `components/admin/admin-order-editor.tsx` — client component with Present mode, overflow menu, per-line admin overlay (override price input + remove button, stubbed).
- `components/admin/new-customer-dialog.tsx` — dialog-based create flow replacing inline form. Supports `variant="fab"` for customers index.
- `components/admin/customers-search-index.tsx` — search-dominant landing index (r3). Large centered search, Recently opened list, instant-filter results.
- `components/admin/customer-home-actions.tsx` — customer-home Start/Continue + Share portal buttons, plus overflow menu (Edit / Regenerate / Delete).
- `app/(admin)/admin/page.tsx` — new `/admin` drawer page (grouped list: Catalog / Team / Insights / Account).
- `app/(admin)/admin/customers/[id]/edit/page.tsx` — contact + catalog settings form, promoted out of customer home.

### Modified (r4)
- `app/(admin)/layout.tsx` — drops `AdminNav` + `AdminSidebar`; mounts `AdminTopBar`; removes `pb-20` + `md:pl-60`.
- `app/(admin)/admin/page.tsx` — flat 5-item list; Account card with Sign-out row; no section headers.
- `app/(admin)/admin/customers/[id]/page.tsx` — Products row folded into Recent orders ledger; back arrow + orphan "Edit contact & catalog settings" link removed; overflow menu moved inline (flex sibling of H1).
- `app/(admin)/admin/customers/[id]/edit/page.tsx` — back arrow → "Cancel" link, aligned with H1.
- `components/admin/customer-home-actions.tsx` — split into `CustomerActionsProvider` + `CustomerOverflowMenu` + `CustomerStartOrderButton` so header row and hero button can sit at different DOM positions; Share-portal card deleted; Copy-link added to overflow menu.
- `components/admin/customers-search-index.tsx` — dropped `min-h-[70vh]` + spacer flex children; added `pt-6 md:pt-10`; row padding `py-2.5`; meta format `Apr 20 · Draft` via new `formatShortDate` helper.
- `components/admin/new-customer-dialog.tsx` — FAB bottom offset reduced from `bottom-24` (above old tab bar) to `bottom-6` now that the tab bar is gone.
- `components/admin/orders-section.tsx` — dropped `<h2>Orders</h2>`; New-order moved to FAB; `statusTabs` collapsed to 2 chips (`Needs review`, `Drafts`); mobile cards rewritten as tap-only ledger with read-only pill.

### Modified
- `app/auth/login/page.tsx` — centered glass-blur card matching portal aesthetic.
- `app/(admin)/admin/orders/[id]/page.tsx` — rewritten to use `AdminOrderEditor`.
- `app/(admin)/admin/dashboard/page.tsx` — r3: stripped stats strip + secondary-nav chips. Heading "Today" + `{submitted} need review · {drafts} drafts` subtitle.
- `app/(admin)/admin/customers/page.tsx` — r3 rewrite: server-loads customers, renders `CustomersSearchIndex` + FAB dialog. No more table header or inline list.
- `app/(admin)/admin/customers/[id]/page.tsx` — r3 rewrite: name-as-H1, Start/Continue order + Share portal buttons, recent orders ledger, Products link, overflow menu.
- `components/layout/admin-nav.tsx` — r3: 5 tabs → 3 (Customers / Today / Admin).
- `components/layout/admin-sidebar.tsx` — r3: mirror of bottom nav; collapsible catalog submenu removed.
- `app/(admin)/admin/catalog/page.tsx` — page header breathes, count secondary line.
- `app/(admin)/admin/catalog/[id]/page.tsx` — grouped into Identity/Pack/Commercial fieldsets; sticky save on mobile.
- `app/(admin)/admin/brands/page.tsx` — page header standardized.
- `components/admin/orders-section.tsx` — title+button row, filter row below.
- `components/admin/catalog-products-manager.tsx` — search-first, `+ New product` top-right.
- `components/admin/customer-products-manager.tsx` — sticky save bar → compact pending-changes pill banner.

---

## Verification screenshots (r4 — review-pass refinement)

Captured at 390×844 via preview MCP.

- **Customers index** — top bar (UB + 👥 active + ⚙), tight search near top, compact recents (Apr 20, Apr 17…), FAB bottom-right.
- **Customer home** — name as 4xl H1, inline overflow menu (⋮) top-right of name, single hero button "Start today's order", ledger combines Recent orders + Products trailing row; no back arrow, no standalone edit link.
- **Today** — top bar (UB active), heading + `2 need review · 9 drafts` subtitle, two chips (`Needs review`, `Drafts`), mobile rows are card-list with read-only `Draft` pill, New-order FAB bottom-right.
- **Admin drawer** — top bar (⚙ active), H1 `Admin`, single 5-row card (Products · Brands · Pallet deals · Staff · Reports), Account email + Sign-out as its own card.

## Verification screenshots (r3 — wireframes pass)

Captured at 390×844. Preview on `localhost:3000`.

- `docs/screens/st9-r3-customers-index.png` — Customers landing: large "Find a customer" search, Recently opened list, FAB, 3-tab bottom nav.
- `docs/screens/st9-r3-customer-home.png` — Customer home: name as H1, primary "Start today's order", secondary "Share portal link", ledger of recent orders, Products link, overflow menu top-right.
- `docs/screens/st9-r3-today.png` — Today: compact subtitle (`N need review · N drafts`), no stats cards, no secondary nav chips.
- `docs/screens/st9-r3-admin-drawer.png` — Admin drawer: grouped list (Catalog / Team / Insights / Account), counts right-aligned.

## Verification screenshots (r1–r2)

All captured at mobile (375×812). Dev preview on `localhost:3000`.

- **Login** — centered, glass-blur card, ambient glow (portal aesthetic match).
- **Dashboard** — one-line stats strip, `New order` top-right, orders list first-class.
- **Order detail (edit mode)** — `Share with customer` primary, `+ Add Product`, overflow menu, per-line override input + remove, Present toggle top-right.
- **Order detail (present mode)** — admin chrome collapsed; shows only title, status dot, item list with qty multiplier.
- **Customers list** — search-first, `+ New customer` top-right opens dialog.
- **Catalog list** — `535 products` count, search-first, `+ New product` top-right.
- **Brands list** — `43 brands` count, search first, inline create kept (TODO).

---

## Engineer follow-ups introduced

Filed in `st-9-engineer-followups.md` (to be updated separately). Summary:

1. **Admin order line overlay wiring** — `AdminOrderLine` has stub `overridePrice` and Remove button. Need:
   - `PATCH /api/orders/[id]/items/[lineId]` with `{ unit_price }` (debounced 500ms).
   - `DELETE /api/orders/[id]/items/[lineId]`.
   - Both gated by `status = 'draft'`.
2. **OrderBuilder admin overlay proper reuse** — the current admin editor is a parallel visual implementation, not the real `OrderBuilder` reused. Future pass: extract shared presentation (`UsualRow`, `BrowseRow`, cart bar) into primitives and mount on admin side with `adminOverlay` prop. Gated on OrderBuilder refactor from pre-existing portal pass compile errors (`components/catalog/pallets-rail.tsx`, `components/layout/portal-top-bar.tsx`).
3. **Customer-products autosave per-row** — replace the pending-changes pill with per-row debounced PATCH + `Saved ✓` indicator.
4. **Catalog product detail autosave** — convert each fieldset to per-group autosave; remove Save Product button.
5. **Brands per-row autosave** — eliminate per-row Save; debounce name + logo changes.
6. **Customer detail redesign (Job 6 detail)** — orders-first stack, Share portal compact pill, collapsible "Edit details" accordion for contact+commercial. Requires 324 LOC rewrite; own pass.
7. **Catalog inline create → dialog** — `catalog-products-manager.tsx:253` still has inline toggle; convert to sheet/dialog to match `NewCustomerDialog` pattern.
8. **Brands inline create → dialog** — same as above for `brands-table-manager.tsx`.
9. **Pre-existing portal compile errors** — `components/catalog/pallets-rail.tsx` and `components/layout/portal-top-bar.tsx` have syntax errors from the portal pass. Unrelated to admin but block full-app recompile.

---

## Known limitations

- **Present mode is client-only.** No URL sync — refresh drops it. If salesmen want a shareable "present" link (e.g. iPad kiosk), wire it to a searchParam.
- **Share with customer** copies deep-link to clipboard. No explicit "share via SMS/email" sheet — acceptable given copy is the fast path per existing deep-link flow.
- **Per-line override input and Remove button** are visual stubs — writing to `overridePrice` state does not persist. Marked with inline TODO comment.
