# ST-9 Design Directives — Round 2

Design-only spec. Implementation handled separately — this document records *what* changes, not code edits.

Context: the first order-builder rebuild landed (Usuals-first, Browse-all, Pallets tab, unified cart bar, centered review dialog). User reviewed and issued four directives below.

---

## 1. Pallets as a distinctive sticky callout — not a peer tab

### Problem with current state
The segmented toggle `[ All products | Pallets — Save 💰 ]` treats pallets as a navigation peer of the main catalog. That re-introduces the old framing the rebuild was meant to kill: pallets are a *promotion*, not an alternative mode of shopping.

### Direction
Remove the tab toggle entirely. Pallets becomes a **sticky promotional lane** that lives alongside All-products, always visible while the user scrolls.

### Shape options (pick one during design pass)
- **Option A — Sticky strip under the search bar.** A horizontal-scroll rail of pallet cards, `sticky top-[searchbar-height]`, ~h-28 with hero image + "Save $X" chip. Expands on tap to full pallet detail.
- **Option B — Collapsible sticky banner.** Single-line collapsed state: `💰 3 pallet deals available — Save up to $240  [ Expand ▾ ]`. Expanded: pallet grid. Stays sticky at top of scroll container when collapsed, pushes content when expanded.
- **Option C — Floating FAB-style promo chip.** Bottom-right floating chip `💰 Pallet deals`, opens a bottom-sheet with the pallet grid. Least intrusive but easiest to miss.

**Recommendation:** Option A — horizontal rail is the most discoverable and matches the "promotion lane" metaphor best. Per-product pallet nudges on UsualRow/BrowseRow still deep-link into it (scroll the matching card into view + highlight).

### Wireframe (mobile, option A)

```
┌─────────────────────────────────────┐
│ Universal Beverages          [👤]   │
├─────────────────────────────────────┤
│ ← Back          Apr 17, 2026        │
├─────────────────────────────────────┤
│ 🔍 Search products...               │   ← sticky search
│ ─────────────────────────────────── │
│ 💰 SAVE WITH A PALLET               │   ← sticky promo rail
│ ┌────────┐ ┌────────┐ ┌────────┐    │
│ │ [img]  │ │ [img]  │ │ [img]  │ →  │   ← horizontal scroll
│ │Save $120│ │Save $80│ │Save $60│    │
│ └────────┘ └────────┘ └────────┘    │
├─────────────────────────────────────┤
│ YOUR USUALS                         │
│ ...                                 │
│ BROWSE ALL                          │
│ ...                                 │
├─────────────────────────────────────┤
│ 3 items · $47.20    [ Review → ]    │
└─────────────────────────────────────┘
```

### Implementation notes (for the engineer)
- Delete `Tabs`/`TabsList`/`TabsTrigger` usage in `components/catalog/order-builder.tsx`.
- Delete `activeTab` state; always render All + Pallets-rail together.
- New component `components/catalog/pallets-rail.tsx` with horizontal scroll container (`overflow-x-auto snap-x snap-mandatory`).
- `PalletCard` gets a narrower compact variant for the rail (~w-64) in addition to the existing full grid variant (retained for a possible "see all pallets" expansion).
- Per-product pallet nudge still fires `openPalletsForProduct(productId)` — now scrolls the rail to that card and pulses it, rather than switching tabs.

---

## 2. Brand + size imagery is first-class

### Problem with current state
Filter selects are text dropdowns (`<select>` for brand, `<select>` for size). With product/brand/size images wired into the DB, this is a wasted affordance — users would scan logos much faster than names.

### Direction
Convert filter bar into an **image-chip rail**. Grouping headers in Browse-all get brand logos. Thumbnails fall back through a hierarchy: product image → brand image → size image → `<Package>` icon.

### Wireframe

```
BROWSE ALL
┌─────────────────────────────────────┐
│ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ →             │   ← brand logo chips, scrollable
│ [355ml] [500ml] [1L] [pallet] →     │   ← size chips below, scrollable
├─────────────────────────────────────┤
│  [🍺] HEINEKEN                      │   ← group header with logo
│  ┌───────────────────────────────┐  │
│  │[img] Heineken 6×330ml  $12.40 │  │
│  │       [ + Add ]               │  │
│  └───────────────────────────────┘  │
│  ...                                │
│  [🍺] CORONA                        │
│  ...                                │
└─────────────────────────────────────┘
```

### Data dependencies
- `brands.image_url` — **verify column exists**; if missing, add migration.
- `product_sizes` or wherever sizes are normalized — **verify image column exists**; if missing, add migration.
- Existing: `products.image_url`, `pallet_deals.image_url`.

### Implementation notes
- Replace `<FilterSelects>` in order-builder render tree with `<BrandChipRail>` + `<SizeChipRail>`.
- Selected chip gets accent ring + scale.
- `UsualRow` / `BrowseRow` / `PalletCard` thumbnail prop gets a fallback chain helper in `lib/image-fallback.ts`:
  ```
  resolveProductImage(product, brand, size) -> string | null
  ```
- Brand group headers in Browse-all get an `h-6 w-6 rounded` brand logo next to the label.

---

## 3. Review as a 65vh slide-up overlay on both viewports

### Problem with current state
Review is currently a centered `<Dialog>` that lifts users away from the order context. On desktop especially, it feels like a modal break rather than an adjacent view.

### Direction
Review **slides up from the bottom** on both mobile and desktop, filling 65% of viewport height. The existing cart summary bar acts as the top edge of the sheet — the Review button morphs into a close/collapse handle. Page content behind the sheet keeps its spacing (no jump).

### Wireframe — closed state (both viewports)

```
│ ... catalog content ...             │
│                                     │
├─────────────────────────────────────┤
│ 3 items · $47.20    [ Review → ]    │   ← CartSummaryBar
└─────────────────────────────────────┘
```

### Wireframe — open state

```
│ ... catalog content (still visible) │
│                                     │
├═════════════════════════════════════┤   ← top of sheet, = cart bar baseline
│ 3 items · $47.20    [ ↓ Close ]     │   ← bar becomes handle, button morphs
├─────────────────────────────────────┤
│ Apr 17, 2026          [ Reset all ] │
│                                     │
│ [img] Heineken 6×330ml              │
│       $12.40 × 2     $24.80 [−2+]   │
│ ─────                               │
│ [img] Corona 12×355ml               │   ← scrollable line items
│       $18.40 × 1     $18.40 [−1+]   │
│ ─────                               │
│ ...                                 │
│                                     │
├─────────────────────────────────────┤
│ Total                      $47.20   │
│ [        Submit order  ✓        ]   │   ← w-full accent, bottom-sheet case
└─────────────────────────────────────┘
```

### Height + motion
- Sheet height: `h-[65vh]` on both viewports. Content behind does NOT shrink — sheet overlays.
- Motion: 200ms ease-out slide from `translate-y-full` to `translate-y-0`.
- Backdrop: `bg-black/30 backdrop-blur-sm` behind the sheet (glass-blur rule).
- On desktop, the sheet stays full-width but content inside constrains to `max-w-2xl mx-auto` for readability.
- Cart bar's position is unchanged — when sheet opens, the bar is conceptually *the top of the sheet*, so vertically it's at the `35vh` mark from the top (i.e. the seam). The bar does not slide away.

### Implementation notes
- Rewrite `components/catalog/review-order-sheet.tsx` to NOT use `<Dialog>`. Use a Radix `<Dialog>` primitive *without* the default centered content styles, OR use Vaul / a custom portal.
- On open, bar's `Review →` button label swaps to `↓ Close`; click toggles sheet state.
- Preserve body padding — since sheet overlays, no content shift is needed.
- `max-w-2xl` content wrapper inside the sheet for desktop readability.
- Design-system rule check: the `Submit order` button is full-width — this is the bottom-sheet action-row case, allowed.

---

## 5. Full product title always visible — no truncation anywhere

### Problem with current state
`BrowseRow` uses `truncate` on the title; `UsualRow` similarly clips long names. On narrow mobile widths or for long brand+flavor combos (e.g. "Heineken Silver Lager Non-Alcoholic 0.0%"), the user sees "Heineken Silver Lager Non-…" and has to guess. Re-provisioning needs certainty — clipped names break trust.

### Direction
**No title truncation on any device, ever.** Titles wrap to as many lines as needed. Row height becomes variable. Thumbnails stay pinned to the top-left of the row, other metadata (pack label, price, action button) flow below or align to a flexible grid.

### Wireframe — long-title case

```
┌─────────────────────────────────────┐
│ [img]  Heineken Silver Lager        │   ← wraps to 2 lines
│  h-10  Non-Alcoholic 0.0%           │
│        6×330ml · $12.40    [ + Add ]│
└─────────────────────────────────────┘
```

### Applies to
- `BrowseRow` — remove `truncate` from the title span; allow wrap.
- `UsualRow` / `UsualCard` — same.
- `PalletCard` — same.
- Review sheet line items — same.
- Admin customer-products table — same (desktop table cell allows wrap; mobile card already does).
- Any `<DialogTitle>` referencing product names.

### Implementation notes
- Replace `truncate` / `text-ellipsis` / `whitespace-nowrap` on product-title spans with nothing (default `whitespace-normal`).
- Ensure flex containers use `items-start` (not `items-center`) on rows where the title may now span 2+ lines, so the thumbnail and action button align to the top rather than recentering on a tall row.
- Action button (`+ Add` / stepper) stays top-right aligned on wrapped rows — or drops to a second row on narrow mobile, whichever keeps the click target stable.
- Test against the longest product name currently in the DB (run a one-off query: `select title from products order by length(title) desc limit 5`) and make sure the layout survives.

---

## 6. Design-only working mode

### Directive
I am the design role. Implementation is owned by someone else. From this point:

- I do not edit `.tsx`, `.ts`, `.sql`, or wire up new APIs.
- I record every change as a design spec (this doc, `st-9-ui-ux-critique.md`, or a companion) with: what changes, why, wireframe, and implementation notes for the engineer.
- Verification flows, migrations, typecheck runs → not my job.
- If I notice a design gap while reviewing code, I add a directive here rather than patching.

### What this doc owes the engineer for each directive
1. The problem with the current state.
2. The chosen direction (or options + recommendation).
3. Wireframe.
4. Data/dependency checks the engineer needs to run before building.
5. Implementation notes — file names, primitive choices, edge cases.

---

## Outstanding design items — hand off

These were touched in implementation already but still need a design pass recorded here so the engineer knows the *design intent*, not just the code:

- **Admin `is_usual` pin toggle UI** — currently a label-adjacent switch labeled "Pin" in the customer-products-manager (mobile card + desktop table). Design intent: should this be a star icon toggle instead of a switch? Star is the conventional "pin/favorite" affordance and reads faster than a generic toggle. Recommended: replace the switch with a `<StarIcon>` button that fills gold when pinned.
- **Usuals section "Pinned by your salesman" label** — current copy may read as passive/formal. Consider: "Your salesman recommends" or just a small pin icon next to "Usually buys N" → "📌 Always keep stocked".
- **Pallet rail empty state** — when the customer has no pallet deals available, should the rail disappear entirely, or show a placeholder "No pallet deals this week"? Recommended: disappear entirely, keep the UI clean.
