# ST-9 Engineer Follow-ups

Design implementation is complete. These function-layer changes are required to land the redesign cleanly. Grouped by impact; each item is self-contained.

## Dead code to delete

- `components/catalog/pallets-rail.tsx` — no longer imported. Safe to remove.
- `components/catalog/usuals-list.tsx` — no longer imported (logic inlined into `OrderBuilder`). Safe to remove.
- `components/catalog/usual-row.tsx` — no longer imported. Safe to remove.

## Unused props to clean up

- `PortalTopBar.customerName` (`components/layout/portal-top-bar.tsx`) — prop still passed by `app/(portal)/portal/[token]/layout.tsx` but no longer rendered. Either drop the prop or surface it somewhere intentional.
- `BrowseRowProps.hasPalletDeal` and `onOpenPallets` (`components/catalog/browse-row.tsx`) — typed but unused in the flattened row. Remove from the interface and from the caller in `OrderBuilder`.
- `SizeFilterMenu` alias in `components/catalog/filter-chips.tsx` — kept as a back-compat re-export of `SizeChips`. Once all callers use `SizeChips`, delete the alias.

## Data needs for the new pallet detail popup

The popup shows the list of products inside a pallet deal with quantities + images. Current `PalletDeal` type doesn't carry item breakdown. Engineer work:

1. Add a query (or extend the existing pallet-deals loader) that returns `pallet_deal_items` joined with the `products` table, shape:
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
2. Extend the `PalletDeal` type (or pass alongside) with `items: PalletDealItem[]`.
3. Update the server loader in `app/(portal)/portal/[token]/order/link/[id]/page.tsx` and the `[date]` equivalent to populate it.
4. Thread into `OrderBuilder` → the new `PalletDetailDialog` component.

## Review flow

- Current: review opens as a bottom-sheet overlay via `ReviewOrderSheet`.
- Target per theory: a dedicated `/portal/[token]/order/[id]/review` route so submit has its own URL + back button + focus.
- Needs: new page route, a server loader that hydrates review items from `order_items`, a "Back to order" link, same submit/reset wiring as current. Low priority — the sheet works.

## Landing CTA — date shifter

The redesigned `StartOrderHero` separates parameter from verb:
- Left: a compact date pill `[<] {formatted date} [>]` — outline bordered, chevrons shift ±1 day, date text opens the native picker.
- Right: accent `Start order →` button sized to content (not `w-full`).

Functional notes for the engineer:
- The `moveDate` handler clamps to `todayISODate()` for the past. Verify this matches business rules — there may be lead-time constraints (e.g. can't deliver tomorrow).
- The `>` (forward) chevron has no upper bound currently. Consider a max-days-out window (30/60 days) if the backend rejects far-future dates.
- The native `<input type="date">` trigger relies on `showPicker()` which requires user gesture; Safari <16 will fall back to focusing the input. Acceptable.

## Accent-color policy

Design now reserves accent (orange) exclusively for commit actions: Review, Submit, Start Order. Other affordances that still use accent inappropriately:

- `components/ui/status-chip.tsx` draft state — verify color choice fits new palette.
- Any `variant="accent"` on non-commit buttons should flip to `variant="default"` or `variant="outline"`.
- `components/admin/*` uses accent more liberally — out of scope for this pass but worth an audit.

## Filter toolbar

The toolbar in `OrderBuilder` is three stacked elements (not a single card):
- Search input (full-width, top)
- `<SizeChips>` facet row — label `Size` + wrapping chips + `+N more` overflow
- `<BrandChips>` facet row — label `Brand` + wrapping chips + `+N more` overflow

Each facet wraps onto multiple lines rather than horizontally scrolling. Tapping an active chip clears that facet. `collapseAfter` defaults: 10 sizes, 8 brands. If a customer's catalog has fewer than those counts, the toolbar renders without the overflow chip.

**State persistence:** filter state is client-only (`useCatalog` hook), no URL sync. If operators want to share filtered views or survive reloads mid-task, engineer should persist `filters.searchQuery / brandId / sizeFilter` to URL searchParams.

## Browse auto-expand heuristic

Currently browse is collapsed by default and auto-expands when `isFilterActive` (brand or size selected). It does **not** auto-expand when the user types in search within the collapsed state — because search input lives inside the expanded section. That's intentional: the entry point for search is "tap Add something else." If telemetry shows users fumble for search, consider promoting search to a persistent topbar control (theory allows this as a Tesler mode with its own entry point).

## Types/lint/tests

After deletions above:
- Run `npm run typecheck` — should be clean.
- Run `npm run lint` — resolve any `no-unused-vars` in the files I edited.
- Run `npm run test` — no unit tests target deleted components, should pass.
- Run `npm run test:e2e` — any E2E that clicks "Save with a pallet" sticky dock, the pallets tab, or search-bar-at-top will need selector updates. Grep for `data-testid` or common text in test files.

## Customer-facing copy to review with stakeholders

- "Add something else →" (browse escape hatch) — alternatives: "Browse all products", "Add more items"
- "5 pallet deals available" — alternatives: "Bulk savings", "Pallet deals"
- "Start order for {date}" — alternatives: "Begin {date} order"

Design picked the most neutral/operational phrasings. Marketing may want punchier.
