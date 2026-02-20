# Dashboard + Portal UX Live Implementation Board

## Current Goal (Live)
Ship remaining WS-10 and WS-11 corrections so admin and customer portal ordering flows are stable, clickable, mobile-safe, and backend-persistent.

## Active Scope (Live)
- Portal order-link persistence and `Review and Send` payload reliability.
- Catalog/pallet reorder workflow: drag + multi-select + batch move/delete.
- Full-row click behavior across required admin and portal tables.
- Mobile containment/layout fixes (dialogs, add/search rows, pallet surfaces).
- Deep-link and copy-url correctness (customer portal targets, absolute URLs).

## Locked Decisions
- "Shift to the tight" is treated as "shift to the right".
- Search is constrained width on desktop and does not consume full row by default.
- On mobile, add controls and search controls split to separate rows where requested.
- Copy URL actions should return full absolute customer portal URLs.

## Live Workstreams

### WS-1: Dashboard + Orders UX
**Files**
- `app/(admin)/admin/dashboard/page.tsx`
- `components/admin/orders-section.tsx`
- `app/(admin)/admin/orders/[id]/page.tsx`
- `components/admin/order-status-form.tsx`

**Tasks**
1. Improve dashboard stat-card/button text alignment and clarity.
2. Keep full-row click behavior for orders table and ensure status-pill click does not trigger row navigation.
3. Keep status as inline editable pill in orders list.
4. Move order status control on order detail near CSV actions; remove standalone bordered "Order Status" section.
5. Add deep-link copy button next to CSV on order detail page.

**Acceptance Criteria**
- Order row click opens order detail; clicking status pill only changes status.
- Order detail no longer has a separate bordered status block.
- CSV + deep-link + status controls are visually grouped and usable on mobile/desktop.

---

### WS-2: Create and Search Control Rows
**Files**
- `app/(admin)/admin/customers/page.tsx`
- `app/(admin)/admin/catalog/page.tsx`
- `app/(admin)/admin/catalog/pallets/page.tsx`
- `components/admin/orders-section.tsx`

**Tasks**
1. Place "New" action(s) and search in one row where requested.
2. Constrain search width so it is not full width.
3. Ensure responsive behavior: single row on desktop, wrap cleanly on mobile.

**Acceptance Criteria**
- Controls share one row on desktop.
- Search does not occupy full width unless viewport forces wrap.
- Visual hierarchy matches action-first then search.

---

### WS-3: Live Search (Admin)
**Files**
- `components/admin/orders-section.tsx`
- `app/(admin)/admin/customers/page.tsx`
- `app/(admin)/admin/catalog/page.tsx`
- `app/(admin)/admin/customers/[id]/products/page.tsx`

**Tasks**
1. Standardize debounced live filtering for orders, customers, and products.
2. Preserve URL query state while typing (shareable deep-link state).
3. Remove explicit search-submit dependency where live behavior is requested.

**Acceptance Criteria**
- Results update as user types (with debounce).
- Refresh/back-forward preserves query state.
- No regressions in server-side filtering correctness.

---

### WS-4: Draft Order Dialog + Customer Creation
**Files**
- `components/admin/orders-section.tsx`
- `app/api/customers/route.ts` (new)

**Tasks**
1. Add missing `POST /api/customers` route for in-dialog customer creation.
2. Keep existing toggle flow (existing customer vs new customer).
3. Add strong error handling and validation messages in dialog.

**Acceptance Criteria**
- Creating "New Draft Order" with a new customer works end-to-end.
- Newly created customer is immediately used for draft creation.
- Failed customer creation does not silently fail.

---

### WS-5: Shared "Add Product" Dialog (Order + Customer Catalog)
**Files**
- `app/(admin)/admin/orders/[id]/page.tsx`
- `app/(admin)/admin/customers/[id]/products/page.tsx`
- `components/admin/*` (new shared dialog component)
- `app/api/orders/[id]/items/route.ts` (new or extended endpoint for admin item add)

**Tasks**
1. Build shared dialog focused on search/filter first, then add action.
2. Reuse for:
   - adding items to an order
   - adding items to customer custom catalog
3. Include brand/size filters and quick quantity/selection controls.

**Acceptance Criteria**
- Same dialog pattern appears in both contexts.
- User can find and add products without leaving page.
- Interaction is keyboard-friendly and mobile-usable.

---

### WS-6: Customer + Catalog Management Polish
**Files**
- `app/(admin)/admin/customers/page.tsx`
- `app/(admin)/admin/customers/[id]/page.tsx`
- `app/(admin)/admin/customers/[id]/products/page.tsx`
- `app/(admin)/admin/catalog/page.tsx`
- `app/(admin)/admin/catalog/[id]/page.tsx`
- `app/(admin)/admin/brands/page.tsx`
- `app/(admin)/admin/catalog/pallets/page.tsx`

**Tasks**
1. Add `Copy URL` button on customer rows.
2. Put catalog settings controls in one desktop row; flex-wrap on mobile.
3. Replace product-management checkboxes with toggles for:
   - discontinued
   - hide availability
4. Fix custom-pricing table header/body alignment.
5. Remove product-header brand/pallet links.
6. Remove catalog back button from brand/pallet header where requested.
7. Add image field to "New Product" form.
8. Move brand upload image control into same compact row.
9. For catalog pages, keep add + search in a compact single row.

**Acceptance Criteria**
- Custom-price table columns align in all breakpoints.
- Toggle controls reflect saved state correctly.
- New product supports image upload during creation.

---

### WS-7: Pallet Creation Flow Unification
**Files**
- `app/(admin)/admin/catalog/pallets/page.tsx`
- `app/(admin)/admin/catalog/pallets/[id]/page.tsx`
- Optional: `app/(admin)/admin/catalog/pallets/new/page.tsx`

**Tasks**
1. Ensure "new pallet" opens same edit surface used by existing pallets.
2. Start with empty/default values and immediate item-add workflow.

**Acceptance Criteria**
- User does not use a separate oversized create panel.
- New and existing pallet editing UX is the same.

---

### WS-8: Customer Portal Redesign
**Files**
- `components/catalog/order-builder.tsx`
- `lib/hooks/useCatalog.ts`
- `app/(portal)/c/[token]/order/link/[id]/page.tsx`

**Tasks**
1. Tab order/layout:
   - Place `All` on left.
   - Move `New Items` as a section under `All`.
2. Group container redesign:
   - Make group title larger.
   - Shift title alignment right.
   - Add full border around each group container (header + body), not just separator lines.
   - Make expand target more obvious (clickable header area + chevron state).
3. Filter behavior change:
   - When brand or size filter is active, disable grouping and show a flat results list.
4. Pallet assist action:
   - If item belongs to one or more pallets, show `Save with a pallet`.
   - Clicking switches to pallets view pre-filtered to pallets containing that item.
5. Size-group clarity:
   - When grouped by size, ensure brand name is visible in item label.

**Acceptance Criteria**
- Group cards are visually obvious and fully bordered.
- Brand/size filtering returns an ungrouped list.
- "Save with a pallet" navigates user to relevant pallet options.
- Size view preserves brand context in labels.

---

### WS-9: QA, Regression, and Rollout
**Files**
- `tests/e2e/*.spec.ts`
- `tests/unit/*.test.ts`

**Tasks**
1. Add/adjust E2E coverage for:
   - live search
   - row click behavior + status pill interaction
   - dialog creation flows
   - portal grouping/filter behavior
2. Verify mobile/tablet/desktop breakpoints for all changed pages.
3. Validate no API regression on order/customer/product updates.

**Acceptance Criteria**
- Critical UX paths pass E2E checks.
- No blocking layout regressions on mobile.
- Updated behavior matches request list.

## Execution Order
1. WS-1, WS-2, WS-3 (high-impact UX, low architecture risk)
2. WS-4, WS-5 (new API + shared dialog behavior)
3. WS-6, WS-7 (catalog/customer/pallet consistency pass)
4. WS-8 (portal redesign focused pass)
5. WS-9 (regression and stabilization)

## Risks and Mitigations
- **Risk:** shared add-product dialog introduces divergent logic.
  - **Mitigation:** centralize dialog state and pass context-specific callbacks.
- **Risk:** live search may cause excessive re-renders/network churn.
  - **Mitigation:** debounce + local filtering where data is already loaded.
- **Risk:** table alignment regressions across breakpoints.
  - **Mitigation:** fixed column structure, avoid `colSpan`-driven row layout mixing.
- **Risk:** portal grouping/filtering changes reduce discoverability.
  - **Mitigation:** preserve clear empty states and visible filter state chips.

## Definition of Done
- All requested UX changes implemented and verified.
- New/changed flows covered by tests or documented manual checks.
- No critical visual regressions in admin or portal layouts.

## Status Update (February 19, 2026)

### What Worked (Marked Complete)
- [x] `npm run typecheck` passed.
- [x] `npm run test` passed (unit tests).
- [x] `npm run build` passed.
- [x] Runtime `Minified React error #185` issue is fixed in portal ordering flow.
- [x] Inline order status controls near CSV/deep-link actions delivered.
- [x] New + Search compact control rows delivered on key admin pages.
- [x] Live search behavior added to admin customers/catalog/customer-products.
- [x] Dialog-based draft order + create-customer flow wired through new API.
- [x] Shared add-product dialog implemented for order and customer catalog contexts.
- [x] Customer portal baseline redesign delivered (`All` left, `New Items` under `All`, bordered group containers, filter-driven ungrouped list behavior, pallet assist action).

### Workstream Status Snapshot
- [x] WS-1 through WS-9 delivered as baseline v1 (with follow-up issues tracked below).
- [x] WS-10 delivered: post-feedback correction pass implemented.
- [~] WS-11 delivered with regression coverage in place; full e2e validation still blocked by missing local env secrets.

### Open Rework Queue
- [x] Deep-link semantics fixed:
  - Deep-link actions now target customer portal URLs where requested.
- [x] URL copy quality fixed:
  - Copy actions now normalize relative values to full absolute URLs.
- [x] Layout polish delivered:
  - Catalog Settings wrapping updated across breakpoints.
  - Dashboard date filter removed from orders controls.
  - Mobile add/search rows split where requested.
  - Add Product and pallet surfaces constrained for mobile.
  - Customer manage-products naming includes brand context.
  - Brand panel separators, compact logo upload controls, delete actions, and tighter desktop name input widths are implemented.
- [x] Sorting/management workflow delivered:
  - Manual sort-number controls removed from remaining brand surface.
  - Drag + batch move/delete remains the primary workflow for catalog products and pallet deals.
- [x] Pallet deal content UX delivered:
  - Search/filter header remains in place.
  - Full product display naming includes brand.
  - `single` now uses select toggle flow and `mixed` uses quantity entry with autosave (no explicit Save button).
- [x] Portal order persistence delivered:
  - Order-link add/edit autosave behavior and submit flush path persist payloads before submit.
- [x] Clickable rows scope delivered:
  - Required admin and portal row-navigation surfaces are fully clickable with control-safe interaction guards.
- [~] Remaining environment-dependent validation:
  - End-to-end coverage for the full flow is blocked in this local environment until required Supabase/test env secrets are provided.

## WS-10: Post-Feedback Corrections

### Objective
Close the known gaps from the latest QA/user feedback and bring behavior in line with requested interaction model.

### Tasks
1. [x] React `#185` resolved and closed; keep regression coverage to prevent recurrence.
2. [x] Switch deep-link target to customer portal URLs where requested.
3. [x] Normalize all copy-link actions to absolute URLs.
4. [x] Fix Catalog Settings wrapping behavior across desktop/tablet/mobile breakpoints.
5. [x] Replace brand upload affordance with compact input-height icon action.
6. [x] Implement drag-and-drop ordering + batch actions (move/delete) replacing manual sort-number workflow.
7. [x] Add search/filter header to deal contents and render full product display names (with brand).
8. [x] Implement pallet item editing by type:
   - `single`: select button flow
   - `mixed`: quantity selector flow
   - autosave changes (remove explicit Save button)
9. [x] Apply full-row click behavior across admin tables that represent navigable records, explicitly including:
   - admin order items table
   - admin customers table
10. [x] Remove dashboard date search field from the orders controls.
11. [x] On mobile breakpoints, enforce add controls and search controls on separate lines.
12. [x] Fix Add Product dialog sizing/containment so modal frame fully fits mobile viewport.
13. [x] Ensure customer manage-products list/title includes brand in product naming.
14. [x] Fix add-pallet/create-pallet surface containment on mobile.
15. [x] Add stronger visual separators/line treatment to Add Brand panel.
16. [x] Add delete button/action for brands in the brand list.
17. [x] Reduce desktop width footprint of brand name field.

### Acceptance Criteria
- No runtime React crash in affected pages.
- Portal deep links and copied URLs are absolute and correct.
- Rows are fully clickable where navigation is expected, with safe interaction exceptions for controls.
- Pallet editing behavior matches `single`/`mixed` requested model.
- Sorting is drag/batch based, not manual numeric entry.
- Dashboard no longer shows a date search field.
- Mobile layouts keep add and search controls on separate rows where requested.
- Add Product and Add Pallet surfaces are fully visible/contained on mobile.
- Brand list supports delete, compact name field sizing, and clearer panel separators.

## WS-11: Catalog + Portal Ordering Interaction Pass (Current)

### Objective
Implement the latest ordering and bulk-edit UX behavior across admin catalog tables and customer portal ordering surfaces.

### Files
- `app/(admin)/admin/catalog/page.tsx`
- `app/(admin)/admin/catalog/pallets/page.tsx`
- `app/(admin)/admin/catalog/pallets/[id]/page.tsx`
- `app/(portal)/c/[token]/order/link/[id]/page.tsx`
- `app/(portal)/c/[token]/orders/page.tsx`
- `app/api/portal/orders/[id]/items/route.ts`
- `app/api/portal/orders/[id]/route.ts`
- `components/catalog/order-builder.tsx`
- `components/admin/product-picker-dialog.tsx`
- `components/orders/customer-order-readonly.tsx`
- `lib/hooks/useAutoSavePortal.ts`

### Tasks
1. [x] Implement drag + multi-select reorder workflow in catalog/pallet item management.
2. [x] Add batch action mode with checkbox selection:
   - delete selected
   - move selected to index
   - move selected to top/bottom
3. [x] Replace manual sort-number-first workflow with drag-first plus batch move controls.
4. [x] Update pallet type behavior:
   - `single`: show `Select` action
   - `mixed`: show quantity controls
   - auto-save immediately on quantity entry (no explicit Save button)
5. [x] Make products and pallets item-table rows fully clickable while preserving independent checkbox/control interactions.
6. [x] Add-product action should insert a new editable row at the top of the table under the button/search row, without resizing or shifting the controls row.
7. [x] On desktop ordering pages, make the review summary bar a sticky sidebar.
8. [x] In customer portal:
   - make current orders table rows fully clickable
   - default all groups collapsed except `New Items` on initial load
   - show a large top-right context CTA:
     - `Save With Pallets` on pallets flow
     - `Purchase Catalog` on all-items flow
9. [x] Fix portal order-link persistence/submission flow so item changes are saved to backend and included in `Review and Send`.
10. [~] Add regression coverage for row-click + checkbox coexistence, reorder workflows, type-specific autosave behavior, and portal order-link save/send persistence.
   - Added unit coverage for reorder primitives, row-click interactive guards, portal save request generation, deep-link helpers, and copy-url normalization.
   - Full E2E regression path remains blocked by missing local Supabase/env secrets.

### Acceptance Criteria
- Bulk edit can be completed entirely via multi-select controls without manual index typing as the primary path.
- Row click navigation works across catalog and current-orders tables with no accidental navigation from checkbox/action clicks.
- `single` and `mixed` item behavior matches requested UI and saves automatically when quantity is entered.
- Add-product inline row appears at table top and does not shift control-row layout.
- Desktop review panel stays visible as sticky sidebar while scrolling order content.
- Initial portal load opens only `New Items`; all other groups remain collapsed until expanded.
- Top-right portal CTA text changes correctly based on page context.
- From customer order links, added/edited items persist to backend before submit, and `Review and Send` includes the persisted items in the final payload.

## Current Execution Order (1 through 9)
1. [x] Build shared selection model and reorder primitives (drag state + selected-row state) for catalog/pallet item lists.
2. [x] Implement batch toolbar/actions (move-to-index, move-top, move-bottom, delete) and wire backend persistence.
3. [x] Remove manual sort-first UX from affected screens and gate reorder through drag/batch controls.
4. [x] Implement `single` vs `mixed` pallet item behavior with immediate autosave on quantity change.
5. [x] Apply full-row click + checkbox-safe event handling to admin products/pallets tables and portal current-orders table.
6. [x] Implement add-product inline top-row insertion under the control row, with fixed controls sizing.
7. [x] Convert desktop order review area to sticky sidebar layout and verify responsive fallback.
8. [x] Apply portal default-collapse logic (only `New Items` expanded) and top-right large context CTA text switching.
9. [~] Fix portal order-link save/send persistence and run regression pass (unit + e2e + mobile/desktop checks) including this flow.
   - Build/typecheck/unit tests passed; e2e blocked by missing local Supabase/env secrets in current test environment.
