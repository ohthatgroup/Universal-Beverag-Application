# Order Page — Two-Step Family + Grid Flow

> **Updated 2026-04-25 for the surface-system rebuild.** The two-step flow this document describes shipped, but the cart-bar-and-review behavior diverged from the diagrams below. **Critical correction:** the cart bar does NOT remain visible below the open review drawer. The cart bar and the review drawer are now one fused surface — [`<CartReviewSurface>`](../../components/catalog/cart-review-surface.tsx). Tapping Review hides the bar and slides the drawer up from the same vertical region, with the bar's content (item count + accent Review button) cross-fading to the drawer's footer (Total + accent Submit button). The visual reads as **the bar lifting into a panel**, not two surfaces stacking. This is described in [`docs/design-system.md`](../design-system.md) under "The cart-review continuum."
>
> Other corrections to this doc:
> - The pill switcher inside the FamilySheet is the floating colored [`<FamilyPillSwitcher>`](../../components/catalog/family-pill-switcher.tsx) (six per-family colors, icons, darker borders on inactive), NOT the plain `[●Soda][Water]…` row drawn below.
> - Family-mode search inside the FamilySheet is **always visible** in the header — there is no `[🔍]` toggle button.
> - The filter is a `<Panel variant="side-sheet">` that slides in from the right and stacks over the FamilySheet, NOT an inline `FilterCollapsePanel` push-down.
> - The FamilySheet itself is a `<Panel variant="bottom-sheet" width="content">` (Radix Dialog under the hood); on desktop it constrains to `max-w-3xl mx-auto`.

---

## The problem with the current design

Flat brand list with 35+ rows. No organizing principle visible at a glance.
Customer has to know brand name before they can start.

```
CURRENT
─────────────────────────────────────────────────────
← Back  Apr 17

🔍 Search...
[All brands ▾]  [All sizes ▾]  Group: Brand ▾

NEW ITEMS ▾
┌──────────────┐
│  [box icon]  │  ← one tile, then a wall of brand rows
│ Cherry Coke  │
│  −  2  +     │
└──────────────┘
COCA-COLA              >
PEPSI                  >
MEXICAN                >
CANADA DRY             >
DR. BROWNS             >
SNAPPLE                >
...30 more rows        >
─────────────────────────────────────────────────────
```

---

## Step A — Order page at rest

```
MOBILE (375px) and DESKTOP — same layout, no sidebars

┌──────────────────────────────────┐
│ ←  Thursday, May 1              │  ← PortalPageHeader
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ┌────────────────────────────┐   │  ← global search, always visible at top
│ │ 🔍 Search all products...  │   │     tapping opens sheet in "All" mode
│ └────────────────────────────┘   │     with cursor focused in search field
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ YOUR USUALS                      │  ← favorites section
│                                  │
│  ┌──────┐  Coca-Cola  24/20oz    │  ← vertical list, not horizontal scroll
│  │ img  │  $24.99        [1] −   │     each row: small thumbnail + name +
│  └──────┘                        │     pack label + qty selector inline
│                                  │
│  ┌──────┐  Gatorade   24/12oz    │
│  │ img  │  $19.99            [+] │
│  └──────┘                        │
│                                  │
│  ┌──────┐  Poland Spr 24/16oz   │
│  │ img  │  $18.99        [2] −   │
│  └──────┘                        │
│                                  │
│  ┌──────┐  Monster    24/16oz    │
│  │ img  │  $42.99            [+] │
│  └──────┘                        │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ BROWSE                           │  ← section label
│                                  │
│  ┌──────────────────────────────┐│
│  │  🥤  Soda          12  [  →] ││  ← family card, full-width
│  └──────────────────────────────┘│     rounded-xl border bg-card
│                                  │     icon · name · count · chevron
│  ┌──────────────────────────────┐│
│  │  💧  Water          8  [  →] ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │  ⚡  Sports & Hydration      ││
│  │      14 products      [  →]  ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │  🍵  Tea & Juice    9  [  →] ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │  ☕  Energy & Coffee         ││
│  │      11 products      [  →]  ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │  ···  Other         4  [  →] ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘

                                       ↑ page scrolls freely above this line
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← glass-blur divider
╔══════════════════════════════════╗
║  12 items · $318.50   [Review →] ║  ← CartSummaryBar
║  sticky bottom · always visible  ║     fixed position, never scroll-to
║  backdrop-blur-md bg/80          ║     glass-blur background
╚══════════════════════════════════╝
```

**CartSummaryBar is fixed at the bottom of the viewport at all times.**
It is never inside the scroll container. The page content has `pb-20` to
prevent content from hiding behind it. "Review →" opens ReviewOrderSheet.
No scrolling is ever required to access it.

**Family card — with active items in this family:**

```
┌──────────────────────────────────┐
│  🥤  Soda                 [  →]  │
│       12 products  ● 3 in order  │  ← navy dot + in-order count
└──────────────────────────────────┘
```

**Desktop** — same layout, wider container, no sidebars.
Usuals list stays vertical (same rows, just wider). Family cards stay full-width.

```
DESKTOP (≥ 768px) — content column, no sidebars

┌─────────────────────────────────────────────────────────┐
│ ←  Thursday, May 1, 2026                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────────────┐   │
│ │ 🔍  Search all products...                        │   │
│ └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ YOUR USUALS                                              │
│                                                          │
│  ┌──────┐  Coca-Cola Classic   24/20oz    $24.99  [1] − │
│  │ img  │                                               │
│  └──────┘                                               │
│  ┌──────┐  Gatorade Fruit Pch  24/12oz    $19.99    [+] │
│  │ img  │                                               │
│  └──────┘                                               │
│  ┌──────┐  Poland Spring       24/16oz    $18.99  [2] − │
│  │ img  │                                               │
│  └──────┘                                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ BROWSE                                                   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  🥤  Soda                      12 products  [  →] │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  💧  Water                       8 products  [  →]│  │
│  └───────────────────────────────────────────────────┘  │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
╔═════════════════════════════════════════════════════════╗
║  12 items · $318.50                     [Review Order →]║  ← fixed, glass-blur
╚═════════════════════════════════════════════════════════╝
```

---

## Step B — Family sheet (opens on card tap or search focus)

A near-full-height sheet slides up over the page.
The page behind dims with a glass-blur overlay (`bg-foreground/30 backdrop-blur-md`).
The sheet itself is opaque — content is crisp. The dimmed blur is the page behind.
CartSummaryBar remains fixed below the sheet, always accessible.

### Opened from a family card (e.g. Soda)

```
MOBILE

░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← glass-blur overlay on page behind
░  ←  Thursday, May 1            ░     bg-foreground/30 backdrop-blur-md
░  YOUR USUALS                   ░     (same overlay used on all modals)
░  [Soda card ●]  [Water card]   ░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          ────────────               ← drag handle
╔══════════════════════════════════╗
║  ×  Soda            🔍      [≡] ║  ← × closes · search scoped to Soda
║ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ║
║ [●Soda][Water][Sports][Tea][···] ║  ← family pill switcher, scrollable
║ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ║     active = navy fill
║                                  ║
║  20 oz Bottles                   ║  ← size group heading (Soda = size-led)
║                                  ║
║  ┌──────┐ ┌──────┐ ┌──────┐     ║
║  │ [3]  │ │ [ ]  │ │ [ ]  │     ║  ← 3-col ProductTile grid
║  │ img  │ │ img  │ │ img  │     ║     qty badge top-right corner
║  │ Cola │ │ZeroSg│ │DietC │     ║     tap tile → ProductPopout
║  └──────┘ └──────┘ └──────┘     ║
║  ┌──────┐ ┌──────┐              ║
║  │ [ ]  │ │ [ ]  │              ║
║  │ img  │ │ img  │              ║
║  │Sprite│ │ Fanta│              ║
║  └──────┘ └──────┘              ║
║                                  ║
║  12 oz Cans                      ║
║                                  ║
║  ┌──────┐ ┌──────┐ ┌──────┐     ║
║  │ [ ]  │ │ [ ]  │ │ [ ]  │     ║
║  └──────┘ └──────┘ └──────┘     ║
║                                  ║
║  2-Liter  ·  Glass  ·  Mini …   ║
╚══════════════════════════════════╝

╔══════════════════════════════════╗
║  12 items · $318.50   [Review →] ║  ← CartSummaryBar always fixed below
╚══════════════════════════════════╝
```

### Opened from search bar (cross-family / "All" mode — no grouping)

When opened via the search bar the sheet shows a flat list of results
with no size or brand group headings. Family labels appear only as
lightweight section dividers to help orient the customer.
There is no family pill switcher in this mode — it's a pure search surface.

```
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← glass-blur overlay on page behind
░  ←  Thursday, May 1            ░
░  YOUR USUALS                   ░
░  [Soda card]  [Water card] ... ░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          ────────────
╔══════════════════════════════════╗
║  ×        🔍 zero sugar ···|    ║  ← cursor in search on open
║                                  ║     no family name in header
║                                  ║     no pill switcher row
║  ─ Soda ─────────────────────   ║  ← lightweight family divider
║  ┌──────┐ ┌──────┐              ║     (orientation only, not nav)
║  │ [ ]  │ │ [ ]  │              ║
║  │ img  │ │ img  │              ║
║  │C.Zero│ │ZeroSg│              ║
║  └──────┘ └──────┘              ║
║                                  ║
║  ─ Energy & Coffee ────────────  ║
║  ┌──────┐ ┌──────┐ ┌──────┐     ║
║  │ [ ]  │ │ [ ]  │ │ [ ]  │     ║
║  │ img  │ │ img  │ │ img  │     ║
║  │Celsi0│ │MonZ  │ │RedBul│     ║
║  └──────┘ └──────┘ └──────┘     ║
║                                  ║
║  ─ Sports & Hydration ─────────  ║
║  ┌──────┐ ┌──────┐              ║
║  │ [ ]  │ │ [1]  │              ║
║  │ img  │ │ img  │              ║
║  │GatrZ │ │PwrdZ │              ║
║  └──────┘ └──────┘              ║
╚══════════════════════════════════╝

╔══════════════════════════════════╗
║  12 items · $318.50   [Review →] ║
╚══════════════════════════════════╝
```

**Empty search state (no query yet):**

```
╔══════════════════════════════════╗
║  ×        🔍 Search products... ║
║                                  ║
║                                  ║
║        Start typing to           ║
║        search all products       ║
║                                  ║
╚══════════════════════════════════╝
```

### Switching families inside the sheet

```
BEFORE: [●Soda] [Water] [Sports] [Tea] [···]
AFTER:  [Soda]  [●Water][Sports] [Tea] [···]

Header:  "Soda" → "Water"
Grid:    size-led Soda → size-led Water
Search:  clears on family switch
```

### Desktop sheet — same component, wider

The sheet slides up from the bottom on desktop too. No right panel.
The wider viewport gives the product grid 4–5 columns instead of 3.

```
DESKTOP — Soda sheet open

░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░  ←  Thursday, May 1  (glass-blur dim)                 ░
░  YOUR USUALS  ·  BROWSE                               ░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ──────────────
╔═════════════════════════════════════════════════════════╗
║  ×  Soda                    🔍 Search Soda...      [≡] ║
║ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ║
║ [●Soda] [Water] [Sports & Hydration] [Tea] [Energy] ··· ║
║ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ║
║                                                         ║
║  20 oz Bottles                                          ║
║                                                         ║
║  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         ║  ← 5-col
║  │ [3]  │ │ [ ]  │ │ [ ]  │ │ [ ]  │ │ [ ]  │         ║
║  │ img  │ │ img  │ │ img  │ │ img  │ │ img  │         ║
║  │ Cola │ │ZeroSg│ │DietC │ │Sprite│ │Fanta │         ║
║  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         ║
║                                                         ║
║  12 oz Cans                                             ║
║  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         ║
║  │ [ ]  │ │ [ ]  │ │ [ ]  │ │ [ ]  │ │ [ ]  │         ║
║  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         ║
╚═════════════════════════════════════════════════════════╝

╔═════════════════════════════════════════════════════════╗
║  12 items · $318.50                     [Review Order →]║
╚═════════════════════════════════════════════════════════╝
```

---

## Filter panel inside the sheet (family mode only)

Filter is only available when browsing a specific family — not in search/All mode.
Tapping `[≡]` expands the filter panel at the top of the sheet content.

```
║  ×  Soda                    🔍 Search Soda...     [≡●] ║  ← ≡● = active
║ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ║
║ [●Soda] [Water] [Sports] [Tea] [Energy] [Other]        ║
║ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ║
║  GROUP BY   [Size → Brand ●]  [Brand]                  ║
║                                                         ║
║  BRAND                                                  ║
║  [✓ Coke] [✓ Pepsi] [ Canada Dry] [ Schweppes]         ║
║                                                         ║
║  SIZE                                                   ║
║  [✓ 20oz] [ 12oz can] [ 2-liter] [ Glass]              ║
║ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ║
║  20 oz Bottles  (Coke + Pepsi)                          ║
║  ...                                                    ║
```

---

## State summary

```
ORDER PAGE STATE MACHINE

[Step A — page at rest]
  global search bar
  YOUR USUALS — vertical list with inline qty selectors
  BROWSE section — family cards × 6
  CartSummaryBar — fixed bottom, always visible, glass-blur

  → tap search bar     → sheet opens, "All" mode, search focused, no pills, no grouping
  → tap family card    → sheet opens, that family mode, pills visible, size/brand grouping
  → tap [Review →]     → ReviewOrderSheet (existing, unchanged)

[Step B — sheet open, family mode]
  glass-blur dim on page behind (bg-foreground/30 backdrop-blur-md)
  sheet header: × | family name | search | [≡]
  family pill switcher row (scrollable)
  filter panel (collapsed until ≡ tapped)
  product grid: 3-col mobile / 5-col desktop
    size-led grouping: Soda, Water
    brand-led grouping: Energy, Tea, Sports, Other
  CartSummaryBar — still fixed below sheet

  → swipe down or ×          → close, back to Step A
  → tap different family pill → swap grid, clear search, stay open
  → tap product tile          → ProductPopout (qty entry)
  → tap [Review →]            → ReviewOrderSheet

[Step B — sheet open, search/All mode]
  glass-blur dim on page behind
  sheet header: × | search input (focused) | no [≡]
  no pill switcher
  no group headings — flat tile grid
  lightweight family dividers for orientation only
  CartSummaryBar — fixed below

  → clear search / type      → results update live
  → tap product tile         → ProductPopout
  → tap ×                    → close, back to Step A
```

---

## What changes vs today

```
REMOVED
  Deals collapsible section        → moved to homepage (per plan)
  "All products" flat brand list   → replaced by family cards + sheet

CHANGED
  YOUR USUALS: tile grid           → vertical list with inline qty selectors
  CartSummaryBar: scroll-to-reach  → fixed bottom, always visible, glass-blur

NEW
  Global search bar at top of page
  Family cards (BROWSE section)
  FamilySheet component
    family mode: pill switcher + size/brand grid + filter
    search mode: flat grid + family dividers, no pills, no filter

UNCHANGED
  ProductTile + ProductPopout
  FilterCollapsePanel (reused inside sheet, family mode only)
  CatalogGrid (reused inside sheet)
  ReviewOrderSheet
  useAutoSavePortal
  useCatalog hook (gains selectedFamily param)
```
