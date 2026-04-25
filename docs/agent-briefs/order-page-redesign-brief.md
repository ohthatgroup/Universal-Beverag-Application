# Agent Brief — Order Page Redesign (Design Only)

> **Shipped 2026-04-25; partially superseded.** The order-page redesign described below shipped, but the surface system has since been rebuilt (`b5a9f30`–`dc026e2`). For the **current** authoritative state, read [`docs/design-system.md`](../design-system.md) — that is the single source of truth. This brief is retained as historical context for the redesign decisions.
>
> **What changed since this brief was written:**
>
> - `<CartSummaryBar>` and `<ReviewOrderSheet>` no longer exist. They were fused into [`<CartReviewSurface>`](../../components/catalog/cart-review-surface.tsx) — one continuous surface with a closed (bar) state and an open (drawer) state. Tapping Review lifts the bar into a 68dvh panel; bar content cross-fades to drawer footer (Total + Submit).
> - The `<Sheet>` / `<SheetContent side="bottom">` API is no longer used directly. All modals now compose [`<Panel>`](../../components/ui/panel.tsx) with `variant="centered" | "bottom-sheet" | "side-sheet"`.
> - `<SurfaceHeader>` and `<SurfaceFooter>` are deleted. Use `Panel.Header` / `Panel.Body` / `Panel.Footer` slot subcomponents instead.
> - The material tokens `surfaceOverlay`, `surfaceOverlayPrimary`, and `surfaceFloating` are deleted. Only `surfaceFloatingRecessed` (the Stepper's dug-in pill recipe) remains.
> - The cart bar uses plain `bg-background` (not glass). The `bg-background/80 backdrop-blur-md` recipe quoted below is the retired `surfaceOverlay` recipe.
> - The FamilySheet's pill switcher is the floating colored [`<FamilyPillSwitcher>`](../../components/catalog/family-pill-switcher.tsx) — six per-family colors, icons, darker borders on inactive. NOT the plain `[●Soda][Water]…` row described below.
> - The FamilySheet's family-mode header has an **always-on** search input. The `[🔍]` toggle button described below is gone.
> - The FamilySheet's filter is a [`<Panel variant="side-sheet">`](../../components/ui/panel.tsx) that slides in from the right and stacks over the FamilySheet. NOT the inline `FilterCollapsePanel` push-down described below.
> - The product-tile prop is `overlaySlot`, not `footerSlot`. The Stepper renders as a floating overlay on the image, not as a bordered bar below it.
>
> The rest of this brief — usuals as image-first tile grid, six FamilyCards, sheet-based browse, removal of pallet deals, fixed-bottom cart bar — shipped as described.

## Your task

Design the UI for a redesigned customer order page. This is a **design-only
task** — JSX and CSS only. Do not touch database migrations, API routes, or
server-side data fetching. Do not modify `useCatalog.ts` logic yet. Do not
change what data is passed into `OrderBuilder` from the page RSC.

When you are done, every file you touched must pass:
```
npm run typecheck
npm run lint
```

---

## What you have access to

You have the full codebase. The files most relevant to this task are:

```
components/catalog/order-builder.tsx       ← PRIMARY FILE to redesign
components/catalog/product-tile.tsx        ← reuse — note prop is `overlaySlot` (renamed from footerSlot)
components/catalog/product-popout.tsx      ← reuse — uses <Panel variant="centered">
components/catalog/cart-review-surface.tsx ← USE for cart bar + review drawer (fused; replaces CartSummaryBar + ReviewOrderSheet)
components/catalog/family-sheet.tsx        ← USE for family browse — wraps <Panel variant="bottom-sheet" width="content">
components/catalog/family-pill-switcher.tsx ← floating colored per-family pills inside FamilySheet
components/portal/portal-page-header.tsx   ← reuse unchanged
lib/hooks/useCatalog.ts                    ← read to understand
lib/types.ts                               ← read for types
app/globals.css                            ← read for design tokens
components/ui/panel.tsx                    ← USE for any modal-like surface (centered / bottom-sheet / side-sheet)
components/ui/input.tsx                    ← use for search
```

(The deleted-or-replaced files this brief originally listed — `catalog-grid.tsx`, `filter-panel.tsx`, `quantity-selector.tsx`, `cart-summary-bar.tsx`, `review-order-sheet.tsx`, `components/ui/sheet.tsx` for FamilySheet — should not be reached for. See the supersession header above.)

Read each of these files before you start writing anything.

---

## Design system rules (from docs/design-system.md)

> Updated 2026-04-25 for the surface-system rebuild. Live reference is [`docs/design-system.md`](../design-system.md) (Doctrine rules 1–12).

- **Colors:** `--primary` = navy, `--accent` = amber. Use CSS vars not hex.
- **Backdrop:** All Panel and AlertDialog overlays use `bg-foreground/30 backdrop-blur-md`. Never solid dark.
- **Buttons:** Size to content. No `w-full` except bottom-sheet action rows + the review drawer's Submit.
- **Modals:** `<Panel variant="centered">` for creation/input forms, `<Panel variant="bottom-sheet">` for panels anchored to the bottom (FamilySheet, the open state of CartReviewSurface), `<Panel variant="side-sheet">` for secondary panels stacked over a bottom-sheet (the family-sheet filter).
- **Cart bar:** plain `bg-background` with `border border-foreground/10 shadow-2xl`. NOT glass-blur. The cart bar is page chrome, not a floating object.

---

## Current state (what exists today)

`OrderBuilder` renders in this order:
1. `PortalPageHeader` — delivery date + back button
2. Pallet deals collapsible list (REMOVE THIS)
3. Favorites / Usuals tile grid
4. "All products" header + product count
5. Search bar + Filter trigger
6. Filter collapse panel
7. `CatalogGrid` — flat brand list (~35 groups)
8. `CartSummaryBar` — currently at bottom of scroll, not fixed

**Problems:**
- Deals on the order page are being moved to the homepage (remove them here)
- Usuals are a small tile grid — replace with a vertical list with inline qty
- "All products" is an undifferentiated flat list — replace with family cards + sheet
- CartSummaryBar requires scrolling to reach — fix it to the viewport bottom

---

## Target design

### Step A — Order page at rest

The page at rest has three sections stacked vertically:

```
┌──────────────────────────────────┐
│ ←  Thursday, May 1              │  ← PortalPageHeader (unchanged)
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ │ 🔍 Search all products...  │   │  ← global search Input
└──────────────────────────────────┘     tapping/focusing opens FamilySheet
                                         in search/All mode

┌──────────────────────────────────┐
│ YOUR USUALS                      │  ← section label
│  ┌──────┐  Coca-Cola  24/20oz    │  ← vertical list rows
│  │ img  │  $24.99        [1] −   │     thumbnail + name + pack + QuantitySelector
│  └──────┘                        │
│  ┌──────┐  Gatorade   24/12oz    │
│  │ img  │  $19.99            [+] │
│  └──────┘                        │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ BROWSE                           │  ← section label
│  ┌──────────────────────────────┐│
│  │  🥤  Soda          12  [→]   ││  ← FamilyCard, full-width, rounded-xl border
│  └──────────────────────────────┘│     icon · name · product count · chevron
│  ┌──────────────────────────────┐│     if items in order: "● 3 in order" badge
│  │  💧  Water          8  [→]   ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │  ⚡  Sports & Hydration  14  ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │  🍵  Tea & Juice     9  [→]  ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │  ☕  Energy & Coffee   11    ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │  ···  Other          4  [→]  ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← glass-blur divider
╔══════════════════════════════════╗
║  12 items · $318.50   [Review →] ║  ← CartSummaryBar FIXED to viewport bottom
╚══════════════════════════════════╝   bg-background/80 backdrop-blur-md
                                       never inside scroll container
                                       page gets pb-20 to clear it
```

**Desktop:** Same layout, wider column, no sidebars, no layout changes.
Usuals rows get more horizontal room. Family cards stay full-width.

---

### Step B — FamilySheet (new component)

A near-full-height sheet that slides up over the page when a family card
or the search bar is tapped. Use `components/ui/sheet.tsx` (already exists,
uses Radix Dialog). Open from the bottom: `side="bottom"`.

**The page behind** gets `bg-foreground/30 backdrop-blur-md` — this is the
same overlay pattern used on all modals in this codebase (see `design-system.md`).

**Sheet height:** `h-[92dvh]` so a sliver of the page peeks behind it.

#### Family mode (opened from a family card)

```
░░ page behind — glass-blur dim ░░░
╔══════════════════════════════════╗  ← Sheet slides up
║  ────────                        ║  ← drag handle (Sheet default)
║  ×  Soda          🔍 Search  [≡]║  ← header row
║ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄║
║ [●Soda][Water][Sports][Tea][···] ║  ← pill switcher, overflow-x-auto
║ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄║
║  [filter panel — collapsed]      ║  ← FilterCollapsePanel, shown when ≡ tapped
║                                  ║
║  20 oz Bottles                   ║  ← size group heading (Soda = size-led)
║  ┌──────┐ ┌──────┐ ┌──────┐     ║
║  │ [3]  │ │ [ ]  │ │ [ ]  │     ║  ← ProductTile grid, 3-col mobile
║  │ img  │ │ img  │ │ img  │     ║     tap → ProductPopout
║  └──────┘ └──────┘ └──────┘     ║
║  12 oz Cans                      ║
║  ┌──────┐ ┌──────┐ ┌──────┐     ║
║  ...                             ║
╚══════════════════════════════════╝

╔══════════════════════════════════╗
║  12 items · $318.50   [Review →] ║  ← CartSummaryBar still visible below
╚══════════════════════════════════╝
```

**Pill switcher:**
- `overflow-x-auto` horizontal scroll, no scrollbar
- Active pill: `bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-sm font-medium`
- Inactive: `border rounded-full px-3 py-1.5 text-sm text-muted-foreground`
- Tapping a different pill swaps the grid content, clears search query, stays open
- Header title updates to new family name

**Group-by per family:**
- Soda, Water → size-led grouping (`size-brand` from useCatalog)
- Sports, Tea, Energy, Other → brand-led grouping (`brand` from useCatalog)
- Switching family auto-applies the correct groupBy

**Filter panel (`[≡]` button):**
- Reuse `FilterCollapsePanel` from `components/catalog/filter-panel.tsx` exactly
- Only shown in family mode, not in search/All mode
- `[≡]` button highlighted when filters are active

**Product grid:**
- Mobile: `grid-cols-3`
- Desktop: `grid-cols-5`
- Reuse `ProductTile` exactly — qty badge, tap opens `ProductPopout`

#### Search/All mode (opened from search bar)

```
░░ page behind — glass-blur dim ░░░
╔══════════════════════════════════╗
║  ────────                        ║
║  ×      🔍 zero sugar ···|       ║  ← search input, focused on open
║                                  ║     NO family name, NO pills, NO [≡]
║  ─ Soda ───────────────────────  ║  ← lightweight family divider (orientation)
║  ┌──────┐ ┌──────┐               ║     not a nav element, just a label
║  │ img  │ │ img  │               ║
║  └──────┘ └──────┘               ║
║  ─ Energy & Coffee ────────────  ║
║  ┌──────┐ ┌──────┐ ┌──────┐     ║
║  │ img  │ │ img  │ │ img  │     ║
║  └──────┘ └──────┘ └──────┘     ║
╚══════════════════════════════════╝
```

**Empty state (no query typed yet):**
```
║  ×      🔍 Search products...   ║
║                                  ║
║      Start typing to search      ║
║        across all products       ║
║                                  ║
```

- No pills, no groupBy, no filter button
- Flat tile grid, sorted by relevance (keep existing search filter from useCatalog)
- Lightweight family labels as section dividers (text-xs text-muted-foreground)
- Results update live as user types

---

## New component to create

### `components/catalog/family-sheet.tsx`

This is the main new component. It is a client component (`'use client'`).

```tsx
type ProductFamily = 'soda' | 'water' | 'sports_hydration' | 'tea_juice' | 'energy_coffee' | 'other'
type SheetMode = { kind: 'family'; family: ProductFamily } | { kind: 'search' }

interface FamilySheetProps {
  open: boolean
  mode: SheetMode
  onClose: () => void
  products: CatalogProduct[]
  quantities: Record<string, number>
  onQuantityChange: (product: CatalogProduct, qty: number) => void
  showPrices: boolean
  defaultGroupBy: GroupByOption
  usualProductIds: Set<string>
}
```

**Internal state:**
```tsx
const [selectedFamily, setSelectedFamily] = useState<ProductFamily | 'all'>('all')
const [searchQuery, setSearchQuery] = useState('')
const [openProductId, setOpenProductId] = useState<string | null>(null)
```

On open, initialize `selectedFamily` from `mode` and reset `searchQuery`.

**Family constants (define inside this file or a small constants file):**
```tsx
const FAMILIES = [
  { key: 'soda',             label: 'Soda',              icon: '🥤', groupBy: 'size-brand' },
  { key: 'water',            label: 'Water',             icon: '💧', groupBy: 'size-brand' },
  { key: 'sports_hydration', label: 'Sports',            icon: '⚡', groupBy: 'brand' },
  { key: 'tea_juice',        label: 'Tea & Juice',       icon: '🍵', groupBy: 'brand' },
  { key: 'energy_coffee',    label: 'Energy & Coffee',   icon: '☕', groupBy: 'brand' },
  { key: 'other',            label: 'Other',             icon: '···', groupBy: 'brand' },
] as const
```

**Filtering logic (do inside this component, not in useCatalog yet):**
```tsx
const filtered = useMemo(() => {
  let result = products.filter(p => !usualProductIds.has(p.id))

  // family filter (only in family mode)
  if (selectedFamily !== 'all') {
    result = result.filter(p => p.product_family === selectedFamily)
  }

  // search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.brand?.name?.toLowerCase().includes(q) ||
      p.pack_details?.toLowerCase().includes(q)
    )
  }

  return result
}, [products, selectedFamily, searchQuery, usualProductIds])
```

Note: `product_family` does not exist on `CatalogProduct` yet. For now,
add it as an optional field `product_family?: string` to the component's
local filtering — it will simply not filter until the migration adds the column.
This keeps the UI shippable now and functional after the migration.

**Use `useCatalog` for grouping:**
Pass `filtered` products into `useCatalog` with the correct `defaultGroupBy`
based on the selected family. Render the resulting `nestedGrouped` or `grouped`
arrays using the existing `CatalogGrid` component.

**Use existing Sheet component:**
```tsx
import { Sheet, SheetContent } from '@/components/ui/sheet'

<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
  <SheetContent side="bottom" className="h-[92dvh] flex flex-col p-0">
    {/* header */}
    {/* pills (family mode only) */}
    {/* filter panel (family mode only) */}
    {/* scrollable grid */}
  </SheetContent>
</Sheet>
```

---

## Changes to `components/catalog/order-builder.tsx`

Read the full file before editing. Make these changes:

### 1. Remove the pallet deals section (lines ~288–350)

Delete the entire `{palletDeals.length > 0 && (...)}` block. The deals
collapsible list is moving to the homepage. Do not remove `palletDeals`
from the props interface yet — the parent page still passes it.

### 2. Replace the usuals tile grid with a vertical list

Current: `grid grid-cols-4 gap-2 md:grid-cols-8` of `ProductTile`

Replace with a vertical list where each row is:
```
┌──────┐  {brandName} {title}   {pack_details}
│ img  │  {price if showPrices}          [qty]
└──────┘
```

Each row is a `div` with `flex items-center gap-3 py-2`:
- Thumbnail: `h-10 w-10 rounded-md object-cover border bg-muted flex-shrink-0`
  (image or initial letter fallback, same as ProductTile)
- Name column: `flex-1 min-w-0`
  - `getProductDisplayName(product, brand)` — text-sm font-medium truncate
  - pack label — text-xs text-muted-foreground
  - price (if showPrices) — text-xs text-muted-foreground
- `QuantitySelector` on the right — reuse existing component

No `onOpen` / `ProductPopout` on usuals rows — inline qty only.

### 3. Replace "All products" with the global search + family cards

Remove:
- The "All products" / "Browse products" header + count span
- The search bar (it moves to above the usuals section)
- The `FilterTrigger` button from the main page (it moves inside the sheet)
- The `FilterCollapsePanel` from the main page
- The `CatalogGrid` from the main page

Add:
1. A global search `Input` above the usuals section (full-width):
   ```tsx
   <div className="relative">
     <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
     <Input
       placeholder="Search all products..."
       className="pl-9"
       readOnly
       onFocus={() => openSheet({ kind: 'search' })}
       onClick={() => openSheet({ kind: 'search' })}
     />
   </div>
   ```
   It is `readOnly` because actual typing happens inside the sheet.

2. A "BROWSE" section with one `FamilyCard` per family (6 total):
   ```tsx
   <section>
     <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
       Browse
     </div>
     <div className="space-y-2">
       {FAMILIES.map(f => (
         <FamilyCard
           key={f.key}
           family={f}
           productCount={countByFamily[f.key] ?? 0}
           inOrderCount={inOrderCountByFamily[f.key] ?? 0}
           onClick={() => openSheet({ kind: 'family', family: f.key })}
         />
       ))}
     </div>
   </section>
   ```

3. The `FamilySheet` component:
   ```tsx
   <FamilySheet
     open={sheetOpen}
     mode={sheetMode}
     onClose={() => setSheetOpen(false)}
     products={products}
     quantities={quantities}
     onQuantityChange={setProductQuantity}
     showPrices={showPrices}
     defaultGroupBy={filters.groupBy}
     usualProductIds={usualProductIds}
   />
   ```

**State to add to `OrderBuilder`:**
```tsx
const [sheetOpen, setSheetOpen] = useState(false)
const [sheetMode, setSheetMode] = useState<SheetMode>({ kind: 'search' })

function openSheet(mode: SheetMode) {
  setSheetMode(mode)
  setSheetOpen(true)
}
```

**Helper derived values for family cards:**
```tsx
const countByFamily = useMemo(() =>
  products.reduce((acc, p) => {
    const f = (p as any).product_family ?? 'other'
    acc[f] = (acc[f] ?? 0) + 1
    return acc
  }, {} as Record<string, number>),
[products])

const inOrderCountByFamily = useMemo(() =>
  Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .reduce((acc, [key]) => {
      if (!key.startsWith('product:')) return acc
      const id = key.replace('product:', '')
      const p = productById.get(id)
      if (!p) return acc
      const f = (p as any).product_family ?? 'other'
      acc[f] = (acc[f] ?? 0) + 1
      return acc
    }, {} as Record<string, number>),
[quantities, productById])
```

### 4. Fix CartSummaryBar to viewport bottom on ALL breakpoints

Open `components/catalog/cart-summary-bar.tsx`. The current implementation
uses `md:static` which makes the bar scroll with the page on desktop.
**Remove `md:static`, `md:mt-6`, `md:border`, `md:rounded-md`** — the bar
must be `fixed inset-x-0 bottom-0` on every breakpoint.

Replace the root div className with:
```tsx
<div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/80 backdrop-blur-md">
```

The `OrderBuilder` root div must have bottom padding to prevent content from
hiding behind the fixed bar. The existing `pb-28 md:pb-8` in the current
`OrderBuilder` becomes just `pb-28` (same padding on all breakpoints):

```tsx
// OrderBuilder return — outermost div
<div className="pb-28">
  <PortalPageHeader ... />
  {/* search */}
  {/* usuals */}
  {/* browse / family cards */}
  <FamilySheet ... />
  <ReviewOrderSheet ... />
  <PalletDetailDialog ... />
</div>
{/* CartSummaryBar is already rendered as a sibling — leave it there */}
<CartSummaryBar ... />
```

Note: `CartSummaryBar` is already a sibling of the main content `div` in
the current `OrderBuilder` — do not move it. Just update its internal
className as described above.

---

## Small new component — `FamilyCard`

Create inline in `order-builder.tsx` or extract to `components/catalog/family-card.tsx`.

```tsx
interface FamilyCardProps {
  family: { key: string; label: string; icon: string }
  productCount: number
  inOrderCount: number
  onClick: () => void
}
```

```
┌──────────────────────────────────┐
│  {icon}  {label}                 │
│          {productCount} products │  ← text-xs text-muted-foreground
│                          [  →]   │  ← ChevronRight icon
└──────────────────────────────────┘

When inOrderCount > 0, add below the product count:
│  ● {inOrderCount} in order       │  ← text-xs text-primary font-medium
```

CSS: `flex items-center gap-3 rounded-xl border bg-card px-4 py-3 w-full text-left
      hover:bg-muted/50 transition-colors`

---

## What NOT to do

- Do not modify `useCatalog.ts` — filtering happens locally in `FamilySheet`
- Do not modify any API routes or server actions
- Do not modify the page RSC (`app/(portal)/portal/[token]/order/link/[id]/page.tsx`)
- Do not add `product_family` to `lib/types.ts` — use `(p as any).product_family`
  temporarily until the migration lands
- Do not remove `palletDeals` from `OrderBuilderProps`
- Do not touch `ReviewOrderSheet`, `PalletDetailDialog`, `ProductPopout`,
  `CatalogGrid`, `FilterCollapsePanel` — reuse exactly

---

## Engineering handoff log (REQUIRED)

**You must create `docs/handoff/order-page-redesign.md` before you finish.**

This file is read by the backend engineer who wires up the real data and
migrations after this design task ships. It must be exhaustive — every
place where you wrote a no-op, a cast, a TODO, or a placeholder must appear
here. A missing entry = a silent bug in production.

Format each entry as:

```markdown
## <short title>

- **File:** `path/to/file.tsx` line ~N
- **What the UI does now:** <one sentence — what the user sees / what the code does>
- **What needs to happen:** <one sentence — what the engineer must do to make it real>
- **Blocked on:** <migration / API route / type change — be specific>
```

At minimum the log must contain an entry for **every** occurrence of:

1. `(p as any).product_family` — family filter is a no-op until the
   `product_family` column is added to `products` in a migration
2. `countByFamily[f.key] ?? 0` showing 0 on family cards — same dependency
3. `inOrderCountByFamily[f.key] ?? 0` — same dependency
4. Any `// TODO` comment you wrote

Add a **Summary table** at the top listing all entries by file and the
migration/ticket that unblocks each one. Example:

```markdown
| # | File | Blocked on |
|---|------|-----------|
| 1 | family-sheet.tsx | migration: add product_family to products |
| 2 | order-builder.tsx | migration: add product_family to products |
```

---

## Files to create or modify

```
MODIFY:
  components/catalog/order-builder.tsx
  components/catalog/cart-summary-bar.tsx

CREATE:
  components/catalog/family-sheet.tsx
  components/catalog/family-card.tsx        (or inline in order-builder)
  docs/handoff/order-page-redesign.md       ← REQUIRED
```

---

## Verification checklist

After implementation:

1. `npm run typecheck` — zero errors
2. `npm run lint` — zero errors
3. Order page loads — shows search bar, usuals list, 6 family cards, fixed cart bar
4. Tapping a family card opens the sheet with the correct family selected
5. Tapping the search bar opens the sheet in search/All mode with input focused
6. Pill switcher in the sheet swaps the product grid
7. Filter `[≡]` button appears in family mode, not in search mode
8. Closing the sheet returns to Step A cleanly
9. Cart bar is fixed at the bottom on mobile AND desktop — scroll to bottom, bar stays put
10. Usuals show as a vertical list with inline qty selectors
11. Pallet deals section is gone from the order page
12. `docs/handoff/order-page-redesign.md` exists and has a summary table plus
    one entry per `(p as any).product_family` usage and every `// TODO`
