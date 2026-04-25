# Order Page — Mobile Wireframes

> **Superseded as a build target 2026-04-25.** What actually shipped diverged from the "FamilyTabStrip" sticky-tab model these wireframes explore. The shipped order page uses:
> - Image-first usuals tiles in a 3-column grid (matching the FamilySheet grid).
> - Six **FamilyCards** on the page (no tab strip) that open a `<FamilySheet>` (a `<Panel variant="bottom-sheet" width="content">`).
> - Inside the FamilySheet, a **floating colored** [`<FamilyPillSwitcher>`](../../components/catalog/family-pill-switcher.tsx) anchored to the viewport top — NOT an inline sticky tab strip on the page itself.
> - The cart bar is rendered by [`<CartReviewSurface>`](../../components/catalog/cart-review-surface.tsx), a fused cart-bar-+-review-drawer surface — NOT the standalone `<CartSummaryBar>` referenced below.
>
> Read [`docs/design-system.md`](../design-system.md) for the live reference. These wireframes are retained as historical record of the design exploration.

---

## Concept A — Tab strip inline, compact usuals grid

The default layout. Usuals stay as a tight tile grid at the top.
Family tabs sit sticky just below the page header once you scroll past usuals.
Browse content is grouped by size-then-brand (Soda) or brand (Energy/Tea).

```
┌──────────────────────────────────┐
│ ←  Thursday, May 1              │  ← PortalPageHeader
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ YOUR USUALS                      │  ← section label
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │  [3] │ │  [ ] │ │  [1] │ │  [ ] │ │  ← ProductTile (qty badge)
│ │ Cola │ │Water │ │Gator │ │ Mont │ │
│ └──────┘ └──────┘ └──────┘ └──────┘ │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │  [2] │ │  [ ] │ │  [ ] │ │  [ ] │ │
│ │Pepsi │ │ Dr P │ │Snppl │ │  Bai │ │
│ └──────┘ └──────┘ └──────┘ └──────┘ │
└──────────────────────────────────┘

╔══════════════════════════════════╗  ← sticky top-[49px] once scrolled
║ ┌──────┬──────┬──────┬──────┬──┐ ║  ← FamilyTabStrip
║ │ All  │ Soda │Water │Sport │··│ ║     horizontal scroll, pill tabs
║ │ (48) │ (12) │  (8) │ (14) │  ║
║ └──────┴──────┴──────┴──────┴──┘ ║
╚══════════════════════════════════╝

┌──────────────────────────────────┐
│ BROWSE PRODUCTS                  │  ← section label (no product count)
│ ┌────────────────────────────┐   │
│ │ 🔍 Search products...      │[≡]│  ← search + filter trigger
│ └────────────────────────────┘   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 20 oz Bottles                    │  ← size group heading
│   Coke                           │  ← brand sub-heading
│   ┌────────────────────────────┐ │
│   │ Coca-Cola Classic 24/20oz  │ │
│   │ $24.99                 [+] │ │  ← BrowseRow or ProductTile
│   └────────────────────────────┘ │
│   ┌────────────────────────────┐ │
│   │ Coke Zero Sugar 24/20oz    │ │
│   │ $24.99              [1] −  │ │  ← with active qty
│   └────────────────────────────┘ │
│   ┌────────────────────────────┐ │
│   │ Diet Coke 24/20oz          │ │
│   │ $24.99                 [+] │ │
│   └────────────────────────────┘ │
│   Pepsi                          │
│   ┌────────────────────────────┐ │
│   │ Pepsi Cola 24/20oz         │ │
│   │ $23.99                 [+] │ │
│   └────────────────────────────┘ │
│   ...                            │
│                                  │
│ 12 oz Cans                       │  ← next size group
│   Coke                           │
│   ...                            │
└──────────────────────────────────┘

╔══════════════════════════════════╗  ← CartSummaryBar fixed bottom
║  12 items · $318.50    [Review →]║
╚══════════════════════════════════╝
```

**Key behaviours:**
- Tab strip becomes sticky at `top-[49px]` once the usuals section scrolls out of view
- Active tab pill: navy fill + white text; inactive: border + muted text
- Each tab shows product count in a small superscript badge
- Selecting "Soda" → grouping auto-switches to size-then-brand
- Selecting "Energy" or "Tea" → grouping auto-switches to brand
- "All" tab shows combined view with existing size-brand grouping

---

## Concept B — Segmented top navigation (no sticky tab)

Tabs live permanently below the page header, not sticky.
Usuals collapse into a single horizontal scroll row to save vertical space.

```
┌──────────────────────────────────┐
│ ←  Thursday, May 1              │
└──────────────────────────────────┘

┌──────────────────────────────────┐  ← full-width tab bar, no scroll
│ [All] [Soda] [Water] [Sport] [→] │     right arrow reveals more
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ YOUR USUALS        see all (8)   │  ← collapsible row label
│ ← [Cola][Water][Gator][Mont] →  │  ← horizontal tile scroll
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ┌────────────────────────────┐   │
│ │ 🔍 Search products...      │[≡]│
│ └────────────────────────────┘   │
└──────────────────────────────────┘

  ─── 20 oz Bottles ────────────── ←  sticky size-group divider
┌──────────────────────────────────┐
│ Coke                             │
│ ┌──────┐ Coca-Cola 24/20oz      │
│ │ img  │ $24.99           [+]   │
│ └──────┘                        │
│ ┌──────┐ Coke Zero 24/20oz      │
│ │ img  │ $24.99       [1]  −    │
│ └──────┘                        │
│ Pepsi                            │
│ ┌──────┐ Pepsi Cola 24/20oz     │
│ │ img  │ $23.99           [+]   │
│ └──────┘                        │
└──────────────────────────────────┘

  ─── 12 oz Cans ────────────────

╔══════════════════════════════════╗
║  12 items · $318.50    [Review →]║
╚══════════════════════════════════╝
```

**Tradeoff vs Concept A:**
- Simpler — no sticky state logic
- Usuals row is more compact but harder to scan at a glance
- Tab bar doesn't scroll so labels must be very short or truncated
- Loses count badges (no room)

---

## Concept C — Split-panel: family sidebar + content (tablet / large phone)

On screens ≥ 640px, a persistent left column replaces the tab strip.
On small mobile, falls back to Concept A tab strip.

```
MOBILE (< 640px) — same as Concept A

TABLET / LARGE PHONE (≥ 640px):

┌──────────────────────────────────────────────────────┐
│ ←  Thursday, May 1                                  │
└──────────────────────────────────────────────────────┘

┌──────────┬───────────────────────────────────────────┐
│          │ YOUR USUALS                               │
│  All     │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│  ─────   │ │[3] │ │[ ] │ │[1] │ │[ ] │ │[2] │  ...  │
│  Soda    │ └────┘ └────┘ └────┘ └────┘ └────┘       │
│   12     │                                           │
│  Water   │ BROWSE PRODUCTS                           │
│   8      │ ┌───────────────────────────────────┐     │
│  Sports  │ │ 🔍 Search products...          [≡]│     │
│   14     │ └───────────────────────────────────┘     │
│  Tea     │                                           │
│   9      │ 20 oz Bottles                             │
│  Energy  │   Coke                                    │
│   11     │   ┌──────────────────────────────────┐    │
│  Other   │   │ Coca-Cola Classic 24/20oz        │    │
│   4      │   │ $24.99                       [+] │    │
│          │   └──────────────────────────────────┘    │
│          │   Pepsi                                   │
│          │   ┌──────────────────────────────────┐    │
│          │   │ Pepsi Cola 24/20oz               │    │
│          │   │ $23.99                       [+] │    │
│          │   └──────────────────────────────────┘    │
│          │                                           │
│          │ 12 oz Cans                               │
│          │   ...                                     │
└──────────┴───────────────────────────────────────────┘

╔══════════════════════════════════════════════════════╗
║  12 items · $318.50                      [Review →] ║
╚══════════════════════════════════════════════════════╝
```

**Tradeoff vs Concept A:**
- Best use of horizontal space on tablet
- Left column is always visible — no need to scroll back to change family
- More engineering complexity (responsive layout shift)
- Cart bar stays full-width at bottom

---

## Interaction notes (all concepts)

### Filter panel (≡ button)

```
┌──────────────────────────────────┐
│ ←  Thursday, May 1              │
└──────────────────────────────────┘
╔══════════════════════════════════╗  ← tab strip (sticky)
║  [All] [Soda] [Water] [Sport]   ║
╚══════════════════════════════════╝

┌──────────────────────────────────┐  ← filter collapse panel (open)
│ GROUP BY   [Size→Brand] [Brand]  │
│                                  │
│ BRAND                            │
│ [✓ Coke] [✓ Pepsi] [ Canada Dry]│
│ [ Sprite] [ Mountain Dew]        │
│                                  │
│ SIZE                             │
│ [✓ 20oz] [ 12oz can] [ 2-liter] │
└──────────────────────────────────┘

│  products list ...               │
```

### Product popout (tap on tile)

```
╔══════════════════════════════════╗  ← centered Dialog (glass-blur backdrop)
║                                  ║
║    ┌────────────────────────┐    ║
║    │                        │    ║
║    │     product image      │    ║
║    │                        │    ║
║    └────────────────────────┘    ║
║                                  ║
║    Coca-Cola Classic             ║
║    24 × 20 oz PET                ║
║    $24.99 / case                 ║
║                                  ║
║         [−]  [  3  ]  [+]        ║
║                                  ║
║              [Done]              ║
╚══════════════════════════════════╝
```

### Review bottom sheet (tap Review →)

```
                    ╔══════════════╗
                    ║              ║  ← bottom sheet, glass-blur
  ┌─────────────────╫──────────────╫┐
  │ Order Review    ╠══════════════╣│
  │ ─────────────── ║              ║│
  │ Coca-Cola 24/20 ║   3  × $24.99║│
  │ Coke Zero 24/20 ║   1  × $24.99║│
  │ Pepsi 24/20oz   ║   2  × $23.99║│
  │ Gatorade 24/12  ║   1  × $19.99║│
  │                 ║              ║│
  │ ─────────────── ║              ║│
  │ 7 items         ║      $163.94 ║│
  │                 ╚══════════════╝│
  │ [Reset order]       [Submit →] │  ← w-full action row
  └────────────────────────────────┘
```
