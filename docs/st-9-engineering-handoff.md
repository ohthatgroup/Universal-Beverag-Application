# ST-9 Engineering Handoff — Rounds 1–3 (Cumulative)

Last updated: 2026-04-21 (handoff body); **header notes added 2026-04-25 for the Panel rebuild.**
Branch: `codex/fix-pallet-deal-create-flow`
Supersedes: `st-9-round-3-engineering-handoff.md`, `st-9-engineer-followups.md`, `st-9-round-2-issues.md`, `st-9-design-directives-round-2.md`, `st-9-ui-ux-critique.md`, `st-9-screen-audit.md`, `st-9-admin-wireframes.md`, `st-9-admin-design-theory.md`, `st-9-portal-design-theory.md`, `st-9-admin-implementation-log.md`
Companion: `st-9-smoke-test.md` (full checklist)

> **Updated 2026-04-25 for the Panel rebuild.** This handoff predates the portal design doctrine pass and the surface-system rebuild. The customer surface no longer ships the components this handoff describes for the order-page flow:
> - `<ReviewOrderSheet>` is deleted; the review drawer is now the open state of [`<CartReviewSurface>`](../components/catalog/cart-review-surface.tsx).
> - `<CartSummaryBar>` is deleted; the cart bar is the closed state of `<CartReviewSurface>`.
> - The dead-code list below is partially out of date — `usual-row.tsx` was rebuilt (not deleted), `usuals-list.tsx` was rebuilt (not deleted). `pallets-rail.tsx` and `date-selector-card.tsx` may also have moved.
> - The `PortalTopBar.customerName` cleanup flagged below has not been done — the prop is still received and unused.
>
> Read [`docs/design-system.md`](./design-system.md) for the live customer-surface reference. The infrastructure / pallets / data sections of this handoff remain accurate.

Assumption: **no engineering validation has happened since the redesign began.** This document is the single source of truth for everything an engineer needs to ship Rounds 1–3 to production. Design is code-complete; function-layer work is itemized.

---

## 0. Quick orientation

| Round | Scope | Status |
|---|---|---|
| **R1** | Portal rebuild (Usuals-first / Browse-all / unified cart / review dialog), admin overlay editor, dashboard reframe (stats strip → orders-first), search-dominant customer index, grouped catalog fieldsets, centered glass-blur login. | Design shipped. |
| **R2** | Pallets lane as a sticky promo (not a peer tab), brand+size imagery first-class, r3/r4 sub-iterations: 3-tab bottom nav → top-header only, `/admin` drawer flatten, Today strip list chrome, customer-home one-verb, customers index tighten. | Design shipped. |
| **R3** | Polish sweep: toggleable filter chips, single orders `<thead>`, `AdminFab` primitive across all list pages, click-to-edit price, autosave customer settings, sentence-case everywhere, click-to-edit brand names + logo slots, report preset chips, dedicated invite flow, status-as-dots on catalog, shared `QuantitySelector` everywhere. | Design shipped (this PR). |

**Design-only scope (per project memory):** I implemented JSX/CSS and the small PATCH endpoints needed for inline autosave. I did NOT alter server actions, migrations, RLS, or the order-submission pipeline. Everything flagged **E#** below is engineer work.

---

## 1. Every route under `app/` (live inventory)

All admin pages gated by `requirePageAuth(['salesman'])`. Portal pages are gated by a per-customer `access_token` column (not JWT).

### 1.1 Admin (`app/(admin)/admin/*`)

| Route | Page file | Notable component(s) | Round-touched |
|---|---|---|---|
| `/admin` | `page.tsx` | — | R2-r4 drawer flatten |
| `/admin/dashboard` | `dashboard/page.tsx` | `components/admin/orders-section.tsx` | R1, R2-r3, R3 |
| `/admin/orders` | `orders/page.tsx` | `components/admin/orders-section.tsx` | R1, R3 |
| `/admin/orders/[id]` | `orders/[id]/page.tsx` | `components/admin/admin-order-editor.tsx` | R1, R3 |
| `/admin/customers` | `customers/page.tsx` | `components/admin/customers-search-index.tsx`, `components/admin/new-customer-dialog.tsx` | R1, R2-r4, R3 |
| `/admin/customers/[id]` | `customers/[id]/page.tsx` | `components/admin/customer-home-actions.tsx`, `components/admin/customer-settings-inline.tsx` | R1, R2-r4, R3 |
| `/admin/customers/[id]/edit` | `customers/[id]/edit/page.tsx` | — | R1, R2-r4 |
| `/admin/customers/[id]/products` | `customers/[id]/products/page.tsx` | `components/admin/customer-products-manager.tsx` | R1, R3 |
| `/admin/catalog` | `catalog/page.tsx` | `components/admin/catalog-products-manager.tsx` | R1, R3 |
| `/admin/catalog/[id]` | `catalog/[id]/page.tsx` | — | R1 |
| `/admin/catalog/pallets` | `catalog/pallets/page.tsx` | `components/admin/pallet-deals-manager.tsx` | R3 |
| `/admin/catalog/pallets/[id]` | `catalog/pallets/[id]/page.tsx` | `components/admin/pallet-deal-contents-editor.tsx` | R3 |
| `/admin/brands` | `brands/page.tsx` | `components/admin/brands-table-manager.tsx`, `components/admin/brand-logo-slot.tsx` | R1, R3 |
| `/admin/reports` | `reports/page.tsx` | `components/admin/report-date-presets.tsx` | R3 |
| `/admin/staff` | `staff/page.tsx` | `components/admin/staff-table-manager.tsx`, `components/admin/staff-invite-form.tsx` | R3 |

### 1.2 Customer portal (`app/(portal)/*`)

Both route families are live and render the same UI:

| Route | Purpose |
|---|---|
| `/c/[token]` + `/portal/[token]` | Portal home (date stepper + start/continue order + recent orders + draft-resume strip) |
| `/c/[token]/order/[date]` + `/portal/[token]/order/[date]` | Order builder (Usuals / All products / sticky Pallets promo lane / unified cart bar) |
| `/c/[token]/order/link/[id]` + `/portal/[token]/order/link/[id]` | Deep-link resolver into builder scoped to a specific order |
| `/c/[token]/orders` + `/portal/[token]/orders` | Order history (read-only) |
| `/c/[token]/account` + `/portal/[token]/account` | Account self-service |

Magic-link-esque entry: token in URL is matched against `profiles.access_token`. Invalid token → canonical invalid page.

### 1.3 Auth (`app/auth/*`)

| Route | Notes |
|---|---|
| `/auth/login` | R1: centered glass-blur card. Salesman email+password. Forgot-password request starts here and lands on `/auth/reset-email-sent`. |
| `/auth/reset-password` | Link-only reset completion form. Accepts reset `code` or `token`; direct access without either reroutes to `/`. |
| `/auth/reset-email-sent` | Confirmation step. |
| `/auth/reset-success` | Success step. |
| `/auth/accept-invite` | **R3 new dedicated flow** (commit 65f909f). Renders `components/auth/invite-setup-form.tsx`. |
| `/auth/post-login` | Role-based redirect. |

Auth messages canonicalized in `lib/auth/safe-messages.ts`; 51-case test at `tests/unit/auth-safe-messages.test.ts`. Invite flow has a 126-case test at `tests/unit/invite-setup.test.ts`.

---

## 2. Shared primitives (new or modified across rounds)

### 2.1 New in R3

| File | Role |
|---|---|
| `components/admin/admin-fab.tsx` | Shared navy FAB. Replaces 6 inline implementations (`brands-table-manager`, `catalog-products-manager`, `customer-products-manager`, `new-customer-dialog`, `orders-section`, `pallet-deals-manager`, `staff-invite-form`). Fixed `bottom-6 right-5 z-30 h-14 w-14 rounded-full bg-primary`. |
| `components/admin/brand-logo-slot.tsx` | 40px slot: thumbnail when logo present, deterministic colored initial-circle when absent. Floating edit cluster on hover. Uses plain `<img>` — see E1. |
| `components/admin/customer-settings-inline.tsx` | 3-row inline-autosave widget (Switch / Switch / Select). Calls `PATCH /api/admin/customers/:id`. |
| `components/admin/report-date-presets.tsx` | Client chip row for `/admin/reports`. Active preset uses `chipActive` style. |
| `lib/utils/report-date-presets.ts` | Pure helpers (`PRESETS`, `detectActivePreset`, `shouldShowCustomDateInputs`) — importable by server pages (fixed an early runtime error where the client component was imported from a server page). |
| `app/api/admin/customers/[id]/route.ts` | `PATCH` endpoint for the 3 settings columns (`showPrices`, `customPricing`, `defaultGroup`). Mirrors `app/api/admin/brands/[id]/route.ts` pattern. |

### 2.2 New in R1/R2

| File | Role |
|---|---|
| `components/admin/admin-order-editor.tsx` | **R1.** Client component. Present-mode toggle, overflow menu, per-line admin overlay (override price input + remove, stubbed). |
| `components/admin/new-customer-dialog.tsx` | **R1.** Dialog-based create flow. Supports `variant="fab"`. |
| `components/admin/customers-search-index.tsx` | **R1.** Search-dominant landing. Recently opened list, instant-filter results. |
| `components/admin/customer-home-actions.tsx` | **R1.** Start/Continue + Share-portal + overflow menu. Split (**R2-r4**) into provider + overflow + start-button so header and hero can sit at different DOM positions. |
| `app/(admin)/admin/page.tsx` | **R2-r4.** Flat 5-item drawer list + Account card with Sign-out. No section headers. |
| `app/(admin)/admin/customers/[id]/edit/page.tsx` | **R1.** Contact + catalog settings form, promoted out of customer home. |
| `components/layout/admin-top-bar.tsx` | **R2-r4.** Sticky top header (`UB` wordmark → `/admin/dashboard`, Users + Settings icon buttons with active-route highlight). |

### 2.3 Deleted in R2-r4

| File | Reason |
|---|---|
| `components/layout/admin-nav.tsx` | Bottom tab bar removed in favor of top header. |
| `components/layout/admin-sidebar.tsx` | Desktop sidebar removed; desktop uses the same top header. |

### 2.4 Modified across rounds (design-relevant)

`components/admin/admin-order-editor.tsx` · `components/admin/brands-table-manager.tsx` · `components/admin/catalog-products-manager.tsx` · `components/admin/customer-products-manager.tsx` · `components/admin/orders-section.tsx` · `components/admin/pallet-deal-contents-editor.tsx` · `components/admin/pallet-deals-manager.tsx` · `components/admin/staff-table-manager.tsx` · `components/catalog/order-builder.tsx` · `components/portal/customer-home-actions.tsx` · `components/portal/draft-resume-strip.tsx` · `components/portal/past-orders-section.tsx` · `components/portal/start-order-hero.tsx` · `components/ui/status-chip.tsx` (removed uppercase) · `app/(admin)/layout.tsx` (dropped bottom nav + sidebar mounts) · `app/auth/login/page.tsx` (glass-blur card)

---

## 3. APIs added or extended across rounds

| Route | Methods | Purpose | Round |
|---|---|---|---|
| `app/api/admin/customers/[id]/route.ts` | PATCH | Autosave 3 customer settings columns | R3 |
| `app/api/auth/invite-setup/route.ts` | POST | Dedicated invite-acceptance token exchange | R3 |
| `app/api/admin/pallet-deals/route.ts` | POST (expanded) | Pallet deal creation fix (commit fa84767) | R3 |

No DB migrations were added. RLS unchanged.

---

## 4. Round-by-round change log (grouped by surface)

### 4.1 Portal home (`start-order-hero`, `customer-home-actions`, `draft-resume-strip`, `past-orders-section`)
- **R1** Hero with date stepper + Start/Continue verb split from parameter.
- **R2** Brand + size imagery surfaced.
- **R3** Prev-day chevron disabled state (`cursor-not-allowed`, muted) when date ≤ today.
- **R3** "Start order" / "Continue draft" sized to content (was `w-full` — violated the button-width rule).
- **R3** "Recent orders" / draft-resume strip labels sentence-case.

### 4.2 Portal order builder (`components/catalog/order-builder.tsx`)
- **R1** Usuals-first, Browse-all, Pallets tab, unified cart bar, centered review dialog.
- **R2** Pallets tab **deleted**; pallets lane is now a **sticky horizontal-scroll promo rail** under the search bar (always visible during scroll, per-product nudge deep-links into the rail). `activeTab` state removed.
- **R2** Brand + size imagery on rows (first-class).
- **R3** "Your usuals" / "All products" section headings sentence-case.
- **R3** Qty stepper unified on shared `components/catalog/quantity-selector.tsx` (same component used in admin order detail + pallet contents editor).

### 4.3 Auth
- **R1** Login centered glass-blur card.
- **R3** Invite-setup decoupled from password-reset (`components/auth/invite-setup-form.tsx` + `app/api/auth/invite-setup/route.ts`). Middleware allow-lists `/auth/accept-invite`. Canonical copy in `lib/auth/safe-messages.ts`.

### 4.4 Admin chrome (`app/(admin)/layout.tsx`, `admin-top-bar.tsx`)
- **R1** Bottom tab bar + desktop sidebar (5 tabs).
- **R2-r3** 5 tabs → 3 tabs (Customers / Today / Admin).
- **R2-r4** Bottom nav + sidebar **deleted**. Replaced by sticky top header. Layout padding (`pb-20`, `md:pl-60`) removed.

### 4.5 `/admin` drawer
- **R2-r4** Flat single 5-row card (Catalog / Pallets / Brands / Staff / Reports). Account email + Sign-out in a separate bottom card. No section headers.

### 4.6 `/admin/dashboard` + `orders-section.tsx`
- **R1** Stats strip added.
- **R2-r3** Stats strip + secondary-nav chips **removed**. Title "Today"; subline "`N` need review · `N` drafts".
- **R2-r4** `<h2>Orders</h2>` removed; "New order" moved to FAB; chips collapsed to `Needs review` + `Drafts`; mobile rows tap-only with read-only status pill.
- **R3** Chip **toggle-off** on re-click (clears `?status=…`). `aria-pressed` added.
- **R3** Desktop table single `<thead>` with muted date-separator rows between groups (was per-group headers).
- **R3** FAB primitive extracted.

### 4.7 `/admin/orders/[id]` (`admin-order-editor.tsx`)
- **R1** Rewritten client component. Present-mode toggle. 7 header buttons → Share + overflow + Present. Per-line admin overlay (override price + remove, stubbed).
- **R3** Header collapsed into a single card; redundant "Delivered" chip removed; uppercase "STATUS" label removed; click-to-edit unit price; qty stepper unified on `QuantitySelector`.

### 4.8 `/admin/customers` (`customers-search-index.tsx`, `new-customer-dialog.tsx`)
- **R1** Search-dominant index with Recently opened + instant-filter.
- **R2-r4** Dropped `min-h-[70vh]` spacers; `py-2.5` rows; date meta `Apr 20 · Draft`; FAB offset moved from `bottom-24` → `bottom-6` after bottom nav removal.
- **R3** Page header above search (breadcrumb + h1 + count). Sentence-case section labels. FAB primitive extracted.

### 4.9 `/admin/customers/[id]` (customer home)
- **R1** Name-as-H1, Start/Continue + Share-portal buttons, recent orders ledger, Products link, overflow menu. Full edit form moved to `/edit` sub-route.
- **R2-r4** Products row folded into the ledger (not standalone). Back arrow removed. Orphan "Edit contact & catalog settings" link removed. Share-portal card → overflow menu (Copy + Regenerate).
- **R3** Customer settings card: 3 inline-autosave rows (Show prices, Custom pricing, Default grouping). Edit link in the section header removed. Labels full-contrast.

### 4.10 `/admin/customers/[id]/products` (`customer-products-manager.tsx`)
- **R1** Sticky save bar → compact pending-changes pill banner.
- **R3** Title "Products by Brand" → "Visibility & pricing". Per-row custom-price autosaves on blur (was batched section save). "Saved ✓" / "Retry" feedback. FAB for "Add custom product".

### 4.11 `/admin/catalog`
- **R1** Page header breathes; search-first; Identity / Pack / Commercial fieldsets on detail; sticky save on mobile.
- **R3** Status indicator is a tiny colored dot on far-left of each row (was text chip). Discontinued rows have muted titles. `+ New product` → FAB.

### 4.12 `/admin/catalog/pallets`
- **R3** Settings above Contents on every breakpoint. Per-row qty → shared `QuantitySelector`. Sentence-case section labels. `is_active` uses `accent-primary` (full `<Switch>` deferred — E5). Compact image dropzone. FAB for "New pallet deal".

### 4.13 `/admin/brands` (`brands-table-manager.tsx`, `brand-logo-slot.tsx`)
- **R1** Page header standardized.
- **R3** Display-then-edit name (plain text → input on click → autosave on blur). Per-row Save button removed. 40px logo slot with thumbnail / initial-circle / hover cluster. FAB for "New brand".

### 4.14 `/admin/reports`
- **R3** Chip row above From/To (Today / Yesterday / Last 7 / Last 30 / This month / Last month / Custom). Default range corrected (off-by-one). Helpers extracted so server page can detect the active preset.

### 4.15 `/admin/staff`
- **R3** Icon-only actions with Tooltip + `aria-label`. State-driven sets per row (Active / Pending / Disabled). Destructive actions routed through `DestructiveConfirmDialog`. FAB for "Invite staff".

### 4.16 Design-system primitives
- **R3** `status-chip.tsx` no longer uppercase.
- **R3** All-caps `tracking-wide` labels removed across the app.
- **R3** Status indicators consistent: dots on catalog, chips everywhere else.
- **R3** All destructive actions route through `DestructiveConfirmDialog`.

---

## 5. Outstanding engineer follow-ups (cumulative R1–R3)

### 5.1 Blockers / data integrity

| Ref | Severity | Location | Description |
|---|---|---|---|
| **E1** | medium | `next.config.js` + `components/admin/brand-logo-slot.tsx` | Supabase storage hostname not in `images.remotePatterns`. We worked around it with plain `<img>`. Add the hostname, restore `next/image`. |
| **E2** | low | Brand data | Coca-Cola logo URL returns 404 (suspected hostname typo — `wfcwnanssppbhzkkbqap` vs real project `wfcwnansspphzkkbqap`). Re-upload or fix the row. |
| **E3** | medium | Pallet-deal seed data | 8 stale "New Pallet Deal" rows at $0.01 visible on `/admin/catalog/pallets`. One-time DELETE. |
| **E4** | low | `lib/utils.ts` `formatDeliveryDate` | All-caps month tokens (`APR 20, 2026`) — decide whether to switch to mixed-case (`Apr 20, 2026`) for consistency with the rest of the sentence-case sweep. |
| **E5** | low | `components/admin/pallet-deal-contents-editor.tsx` parent form | `is_active` is a checkbox styled with `accent-primary` because the settings form posts via a server action. Full `<Switch>` conversion requires moving the form to client+fetch. |
| **E6** | low | `lib/supabase/*` + pg driver config | pg SSL warning on every request. Set `sslmode=verify-full` explicitly in driver config. |

### 5.2 R1/R2 carryovers (from superseded `st-9-engineer-followups.md`)

**Dead code to delete (verify imports first, then remove):**
- `components/catalog/pallets-rail.tsx` — pallets lane logic absorbed into `OrderBuilder`.
- `components/catalog/usuals-list.tsx` — logic inlined.
- `components/catalog/usual-row.tsx` — logic inlined.
- `components/orders/date-selector-card.tsx` — unused by portal home.

**Unused props to clean:**
- `PortalTopBar.customerName` (`components/layout/portal-top-bar.tsx`) — prop still passed by layout but no longer rendered.
- `BrowseRowProps.hasPalletDeal`, `onOpenPallets` (`components/catalog/browse-row.tsx`) — typed but unused after flatten.
- `SizeFilterMenu` alias in `components/catalog/filter-chips.tsx` — back-compat re-export; drop once callers use `SizeChips` directly.

**Data / loader work for pallet detail popup:**
The popup shows a pallet's products with qty + images. Current `PalletDeal` type lacks item breakdown.
1. Extend the pallet loader to return `pallet_deal_items` joined with `products`:
   ```ts
   type PalletDealItem = {
     product_id: string
     product_title: string
     brand_name: string | null
     pack_label: string | null
     image_url: string | null
     quantity: number  // cases per pallet
   }
   ```
2. Extend `PalletDeal` (or pass alongside) with `items: PalletDealItem[]`.
3. Update server loaders in `app/(portal)/portal/[token]/order/link/[id]/page.tsx` and the `[date]` equivalent.
4. Thread into `OrderBuilder` → `PalletDetailDialog`.

**Review flow (future):**
Current (2026-04-25): `<CartReviewSurface>` — a fused cart bar + review drawer. The closed state is the cart bar; tapping Review lifts it into a 68dvh `<Panel variant="bottom-sheet">` whose footer mirrors the bar's shape. See [`components/catalog/cart-review-surface.tsx`](../components/catalog/cart-review-surface.tsx).
Target per theory: dedicated `/portal/[token]/order/[id]/review` route with back button + focus. Low priority — the fused-surface pattern shipped first because it solved the "two surfaces stacking" feel without needing a route.

**Landing CTA — date shifter business rules:**
- `moveDate` clamps to `todayISODate()` for past. Confirm matches business rules — may be lead-time constraints (e.g. can't deliver tomorrow).
- Forward chevron has no upper bound. Consider 30/60-day max if backend rejects far-future dates.

**Accent-color policy (R1 directive — verify compliance across admin):**
Orange is reserved for commit actions (Review, Submit, Start Order). Flip any `variant="accent"` on non-commit admin buttons to `default` / `outline`. Audit `components/admin/*`.

**Filter state persistence:**
Filter state in `useCatalog` is client-only (no URL sync). If operators want to share filtered views or survive reloads mid-task, persist `filters.searchQuery / brandId / sizeFilter` to URL searchParams.

**Browse auto-expand heuristic:**
Currently auto-expands only when `isFilterActive`. Does NOT expand on search typing because search lives inside the expanded section. Intentional per theory; revisit if telemetry shows fumbling.

**Empty states:**
- No `<EmptyState>` component when customer has zero orders — current copy "No active orders" / "No order history yet" should use `<EmptyState>` with an icon + primary CTA.

**Cross-browser:**
- `<details>` summary marker hidden only on WebKit. Add `list-none` on `<summary>` for Firefox parity.

**A11y (R2 carryover):**
- Draft chips: add explicit `aria-label="Continue draft for {date}, N items"`.
- `<details>` announces "disclosure" to screen readers — verify heading order.

### 5.3 Types / lint / tests

- Run `npm run typecheck` — currently clean.
- Run `npm run lint` — resolve any `no-unused-vars` after the dead-code deletions above.
- Run `npm run test` — vitest suites should pass (includes R3 invite-setup + auth-safe-messages).
- Run `npm run test:e2e` — any E2E that clicks "Save with a pallet" sticky dock, the deleted pallets tab, or inline list buttons now routed through FAB will need selector updates. Grep test files for `data-testid` + common text.

### 5.4 Stakeholder copy review (R1 carryover)

Design picked neutral/operational phrasings; marketing may want punchier:
- "Add something else →" → alternatives: "Browse all products", "Add more items"
- "5 pallet deals available" → alternatives: "Bulk savings", "Pallet deals"
- "Start order for {date}" → alternatives: "Begin {date} order"

---

## 6. Verification status

- Design preview verified on Next dev server for every screen in section 1.
- R3 chip toggle-off fix verified in preview (`/admin/dashboard?status=draft` → click active "Drafts" chip → URL clears, chip returns to outline).
- R3 orders `<thead>` fix verified via DOM inspection — one header, date-separator rows.
- `npm run typecheck` clean.
- Playwright certification not re-run — test selectors may need updates post-FAB-refactor (see 5.3).

---

## 7. How this doc replaces the earlier set

Archived to `docs/archive/`:
- `st-9-admin-design-theory.md`
- `st-9-admin-implementation-log.md`
- `st-9-admin-wireframes.md`
- `st-9-design-directives-round-2.md`
- `st-9-engineer-followups.md`
- `st-9-portal-design-theory.md`
- `st-9-round-2-issues.md`
- `st-9-round-3-engineering-handoff.md` (this round's first draft — superseded by the R1–R3 merge)
- `st-9-screen-audit.md`
- `st-9-ui-ux-critique.md`

Kept in place (still useful):
- `docs/st-9-full-touchpoint-flow-certification.md` — live certification record.
- `docs/st-9-application-flow-inventory.md` — flow-state source of truth.
- `docs/st_9_live_remediation.md` — incident log (preserve).

Added alongside:
- `docs/st-9-smoke-test.md` — full checkbox QA matrix (Rounds 1–3 cumulative).
- `docs/st-9-release-runbook.md` — 10-step release pipeline for cutting the RC to production.

---

## 8. Decision log (why the design-layer shape is what it is)

Captured from user corrections during the redesign — use these to judge edge cases in future rounds rather than re-deriving from code.

- **R1 → R2 pallets pivot.** Pallets started as a peer tab in the portal (Usuals / Browse / Pallets). User rejected it in R2: pallets are a promo, not a browsing mode, so they collapsed into a sticky lane above the unified catalog. Anyone adding a new promo type should inherit this shape, not reintroduce tab peers.

- **R2-r3 → R2-r4 nav pivot.** The portal shipped R2 with a 3-tab bottom nav (Home / Orders / Account). User pulled it mid-round — bottom nav competes with the FAB and splits the mental model. Final shape is top-header only. Do not reintroduce bottom nav without user sign-off.

- **Primary action placement.** On every admin list screen, "Add/New/Create" lives in the page-header top-right, not inline above the list. Enforced in project memory; verified in `PageHeader` usages.

- **FAB color.** FAB is navy `bg-primary`, not orange. Orange is reserved for commitment actions (order submit, mark delivered). Confusing the two would make every list screen look like a commit target.

- **Button width.** Buttons size to content. `w-full` is only for bottom-sheet action rows and mobile form-row submits. Any admin button going full-width in a desktop card is a regression.

- **Modal style.** Creation modals center with glass blur. Confirmation modals are mobile bottom sheets. Both always use glass blur. Do not swap to shadcn default dialog styling.

- **Design-only scope.** On UBA, design rounds implement JSX/CSS/inline-save UX. Server actions, migrations, RLS, and the order-submission pipeline are out of scope and tracked as E# follow-ups. If a design change *requires* server work, it's flagged in §5, not silently patched.

- **Status as dots, not pills, on read-only rows (R3).** User rule: "When displaying status labels and they are not editable, having them as a pill is a lot." Final shape: dot-only on list rows (`h-2 w-2 rounded-full`, far-left), dot-in-pill on filter chips (dot left of label, semantic color preserved inside the active fill). Applies everywhere — if a new surface shows status, use `StatusDot`. Editable status controls (`admin-order-editor`, `order-status-form`) keep their Select.

- **Status dot color never muted by active fill.** The filter chip's active state uses a navy fill but the inner dot keeps its semantic color — identity does not swap with state. Do not add a ring/halo to compensate for contrast; the filled chip already signals active.

- **Conversation history as primary driver.** User explicitly asked that design decisions be driven by the conversation record, not inferred from code alone. Pivots, abandoned approaches, and corrections above are the authoritative shape — the current code is downstream.
