# Dashboard + Portal UX Redesign Plan

## Objective
Implement the requested UX changes across Admin Dashboard, Orders, Customers, Catalog, and Customer Portal with consistent interaction patterns, clearer controls, and mobile-safe layouts.

## Scope
- Dashboard and admin list/table UX improvements
- Draft order creation flow (including create-customer-in-dialog)
- Shared search/filter-first product add dialogs
- Customer and catalog management layout refinements
- Customer portal redesign updates, including group containers and filter behavior changes

## Assumptions
- "Shift to the tight" is interpreted as "shift to the right" for group title alignment in the portal.
- "Reasonable width" for search means constrained width (`max-w-*`) rather than full-row expansion.
- "Copy URL" on customer rows means copy customer portal URL (`/c/{token}`), not admin page URL.

## Workstreams

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

### What Worked
- Type safety and build health:
  - `npm run typecheck` passed.
  - `npm run test` passed (unit tests).
  - `npm run build` passed.
- Core UX delivery (v1) shipped across WS-1 through WS-9:
  - Inline order status controls near CSV/deep-link actions.
  - New + Search compact control rows on key admin pages.
  - Live search behavior added to admin customers/catalog/customer-products.
  - Dialog-based draft order + create-customer flow wired through new API.
  - Shared add-product dialog implemented for order and customer catalog contexts.
  - Portal redesign baseline delivered (`All` left, `New Items` section under `All`, bordered group containers, filter-driven ungrouped list behavior, pallet assist action).

### What Failed / Needs Rework
- Runtime stability:
  - User reported `Minified React error #185` in production flow; root cause not yet isolated in non-minified repro.
- Deep-link semantics:
  - Deep links currently point to admin order route in places where customer portal deep links are expected.
- URL copy quality:
  - Copy actions return relative paths in some flows instead of absolute URLs.
- Layout polish gaps:
  - Catalog Settings wrapping still needs refinement on some breakpoints.
  - Dashboard still shows a date search/filter field that should be removed.
  - On mobile, add and search controls should be separated onto their own lines.
  - Add Product dialog frame can be cut off on mobile and must fit within viewport.
  - Add pallet/create pallet surface is not properly contained on mobile.
  - Customer manage-products view should include brand name in product titles.
  - Brand create/edit panel still needs tighter visual structure ("add a line" separator treatment).
  - Brand upload affordance should be a simpler icon control aligned to input height.
  - Brand list needs an explicit delete action.
  - Brand name input is visually too wide on desktop and should be reduced.
- Sorting/management workflow:
  - Manual numeric sorting still present; drag + batch move/delete workflow not yet implemented.
- Pallet deal content UX:
  - Deal contents still need dedicated search/filter header and full display naming (include brand).
  - `single` vs `mixed` interaction model not yet matching requested behavior (select-only vs quantity + autosave).
- Clickable rows scope:
  - Requirement to make all rows fully clickable has not yet been fully applied to:
    - admin order items table
    - admin customers table
    - other applicable admin tables with row-level navigation.

## WS-10: Post-Feedback Corrections

### Objective
Close the known gaps from the latest QA/user feedback and bring behavior in line with requested interaction model.

### Tasks
1. Reproduce and resolve React `#185` in development mode; patch and verify no runtime crash.
2. Switch deep-link target to customer portal URLs where requested.
3. Normalize all copy-link actions to absolute URLs.
4. Fix Catalog Settings wrapping behavior across desktop/tablet/mobile breakpoints.
5. Replace brand upload affordance with compact input-height icon action.
6. Implement drag-and-drop ordering + batch actions (move/delete) replacing manual sort-number workflow.
7. Add search/filter header to deal contents and render full product display names (with brand).
8. Implement pallet item editing by type:
   - `single`: select button flow
   - `mixed`: quantity selector flow
   - autosave changes (remove explicit Save button)
9. Apply full-row click behavior across admin tables that represent navigable records, explicitly including:
   - admin order items table
   - admin customers table
10. Remove dashboard date search field from the orders controls.
11. On mobile breakpoints, enforce add controls and search controls on separate lines.
12. Fix Add Product dialog sizing/containment so modal frame fully fits mobile viewport.
13. Ensure customer manage-products list/title includes brand in product naming.
14. Fix add-pallet/create-pallet surface containment on mobile.
15. Add stronger visual separators/line treatment to Add Brand panel.
16. Add delete button/action for brands in the brand list.
17. Reduce desktop width footprint of brand name field.

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
