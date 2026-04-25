# Order Page — Desktop Wireframes

> **Superseded as a build target 2026-04-25.** What actually shipped diverged from the FamilyTabStrip / inline FilterCollapsePanel model these wireframes explore. The shipped desktop order page:
> - Renders the same FamilyCards + FamilySheet flow as mobile (no separate desktop nav model).
> - The FamilySheet is a `<Panel variant="bottom-sheet" width="content">` constrained to `max-w-3xl` and centered, with rounded top corners and a floating colored pill switcher anchored to the viewport top.
> - The filter is a `<Panel variant="side-sheet">` that slides in from the right and stacks over the FamilySheet — NOT an inline `FilterCollapsePanel` push-down panel.
> - The cart bar is `<CartReviewSurface>`'s closed state — a `max-w-3xl` rounded-full pill at `bottom-4` on desktop. Tapping Review lifts it into a 68dvh drawer at the same column width.
>
> Read [`docs/design-system.md`](../design-system.md) for the live reference. These wireframes are retained as historical record.

---

## Concept A — Full-width tab strip (recommended for parity with mobile)

Same FamilyTabStrip component, rendered in a wider strip. Products display
in a denser grid. This is the simplest approach — no extra layout work.

```
┌─────────────────────────────────────────────────────────────────┐
│  [logo]  Customers  Orders  Catalog  Reports   [Admin dropdown] │  ← AdminNav
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ←  Thursday, May 1, 2026                                       │  ← PortalPageHeader
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ YOUR USUALS                                                      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │[3] │ │[ ] │ │[1] │ │[ ] │ │[2] │ │[ ] │ │[ ] │ │[4] │  ...   │
│ │Cola│ │Watr│ │Gato│ │Mont│ │Peps│ │DrPp│ │Snpl│ │ Bai│        │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘        │
└─────────────────────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════╗  ← sticky top-[49px]
║ [  All (48)  ] [ Soda (12) ] [ Water (8) ] [ Sports (14) ]     ║
║ [ Tea & Juice (9) ] [ Energy & Coffee (11) ] [ Other (4) ]     ║
╚═════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ BROWSE PRODUCTS                                                  │
│ ┌───────────────────────────────────────────┐ ┌──────────────┐ │
│ │ 🔍  Search products...                    │ │  ≡  Filters  │ │
│ └───────────────────────────────────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────┬──────────────────┐
│                                              │  FILTER PANEL    │  ← desktop slide-in
│  20 oz Bottles                               │  (collapse panel)│
│  ─────────────────                           │                  │
│  Coke                                        │  GROUP BY        │
│  ┌─────────────────────────────────────────┐ │  ○ Size → Brand  │
│  │ Coca-Cola Classic  24/20oz    $24.99 [+]│ │  ○ Brand         │
│  └─────────────────────────────────────────┘ │                  │
│  ┌─────────────────────────────────────────┐ │  BRAND           │
│  │ Coke Zero Sugar    24/20oz    $24.99 [+]│ │  ☑ Coke          │
│  └─────────────────────────────────────────┘ │  ☑ Pepsi         │
│  ┌─────────────────────────────────────────┐ │  ☐ Canada Dry    │
│  │ Diet Coke          24/20oz    $24.99 [+]│ │  ☐ Sprite        │
│  └─────────────────────────────────────────┘ │                  │
│  Pepsi                                       │  SIZE            │
│  ┌─────────────────────────────────────────┐ │  ☑ 20oz          │
│  │ Pepsi Cola         24/20oz    $23.99 [+]│ │  ☐ 12oz can      │
│  └─────────────────────────────────────────┘ │  ☐ 2-liter       │
│                                              │  ☐ Glass         │
│  12 oz Cans                                  │                  │
│  ─────────────────                           │                  │
│  Coke                                        │                  │
│  ┌─────────────────────────────────────────┐ │                  │
│  │ Coca-Cola Classic  24/12oz    $21.99 [+]│ │                  │
│  └─────────────────────────────────────────┘ │                  │
│  ...                                         │                  │
└──────────────────────────────────────────────┴──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  12 items · $318.50                              [Review Order →]│  ← CartSummaryBar
└─────────────────────────────────────────────────────────────────┘
```

---

## Concept B — Persistent left sidebar (no tab strip, sidebar per family)

A fixed left sidebar replaces the tab strip entirely on desktop.
On mobile, collapses to a tab strip (Concept A behaviour).

```
┌─────────────────────────────────────────────────────────────────┐
│  [logo]  Customers  Orders  Catalog  Reports   [Admin dropdown] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ←  Thursday, May 1, 2026                                       │
└─────────────────────────────────────────────────────────────────┘

┌───────────────┬─────────────────────────────────────────────────┐
│               │  YOUR USUALS                                    │
│  BROWSE       │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│  ─────────    │  │[3] │ │[ ] │ │[1] │ │[ ] │ │[2] │ │[ ] │ ... │
│  All  (48)    │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘     │
│               │                                                 │
│  Soda   (12)  │  BROWSE PRODUCTS                                │
│  ●            │  ┌─────────────────────────────────┐ ┌───────┐ │
│  Water   (8)  │  │ 🔍 Search products...            │ │ ≡ Flt │ │
│  Sports (14)  │  └─────────────────────────────────┘ └───────┘ │
│  Tea     (9)  │                                                 │
│  Energy (11)  │  20 oz Bottles                                  │
│  Other   (4)  │  ─────────────────                              │
│               │  Coke                                           │
│               │  ┌─────────────────────────────────────────┐   │
│  ─────────    │  │ Coca-Cola Classic  24/20oz  $24.99   [+]│   │
│  12 items     │  └─────────────────────────────────────────┘   │
│  $318.50      │  ┌─────────────────────────────────────────┐   │
│               │  │ Coke Zero Sugar    24/20oz  $24.99   [+]│   │
│  [Review →]   │  └─────────────────────────────────────────┘   │
│               │  Pepsi                                          │
│               │  ┌─────────────────────────────────────────┐   │
│               │  │ Pepsi Cola         24/20oz  $23.99   [+]│   │
│               │  └─────────────────────────────────────────┘   │
│               │                                                 │
│               │  12 oz Cans                                     │
│               │  ─────────────────                              │
│               │  ...                                            │
└───────────────┴─────────────────────────────────────────────────┘
```

**Tradeoff vs Concept A:**
- Sidebar is always visible — no scrolling back to change family
- Cart summary lives in sidebar (item count + total + Review button)
- No CartSummaryBar needed at the bottom — cleaner scroll experience
- More complex responsive implementation

---

## Concept C — Split content: usuals left, browse right (2-column desktop)

On desktop, usuals panel is a fixed left column.
Browse content occupies the main (right) column with the tab strip.
Best when customers have many usuals and want both visible at once.

```
┌─────────────────────────────────────────────────────────────────┐
│  [logo]  Customers  Orders  Catalog  Reports   [Admin dropdown] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ←  Thursday, May 1, 2026                                       │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────┬─────────────────────────────────────────┐
│  YOUR USUALS          │ [All][Soda][Water][Sports][Tea][Energy] │  ← tab strip
│  ─────────────────    ├─────────────────────────────────────────┤
│  ┌────┐ Coca-Cola     │ ┌──────────────────────────────────┐    │
│  │[3] │ 24/20oz  [3]  │ │ 🔍 Search products...        [≡]│    │
│  └────┘               │ └──────────────────────────────────┘    │
│  ┌────┐ Pepsi         │                                         │
│  │[ ] │ 24/20oz  [+]  │ 20 oz Bottles                          │
│  └────┘               │  Coke                                   │
│  ┌────┐ Gatorade      │  ┌────────────────────────────────┐     │
│  │[1] │ 24/12oz  [1]  │  │ Coca-Cola Classic  $24.99  [+] │     │
│  └────┘               │  └────────────────────────────────┘     │
│  ┌────┐ Monster       │  ┌────────────────────────────────┐     │
│  │[ ] │ 24/16oz  [+]  │  │ Coke Zero          $24.99  [+] │     │
│  └────┘               │  └────────────────────────────────┘     │
│  ┌────┐ Snapple       │  Pepsi                                  │
│  │[2] │ 24/16oz  [2]  │  ┌────────────────────────────────┐     │
│  └────┘               │  │ Pepsi Cola         $23.99  [+] │     │
│  ─────────────────    │  └────────────────────────────────┘     │
│  5 usuals             │                                         │
│                       │ 12 oz Cans                              │
│                       │  ...                                    │
├───────────────────────┼─────────────────────────────────────────┤
│                       │  12 items · $318.50      [Review Order →]│
└───────────────────────┴─────────────────────────────────────────┘
```

**Tradeoff vs Concept A:**
- Best for power users with long usuals lists
- Usuals column stays visible while browsing — easy cross-reference
- Usuals column uses a row-list format (BrowseRow style) not a tile grid
- Most complex layout, hardest to adapt for small tablets

---

## Family-specific browse views (all desktop concepts)

### Soda selected — size-then-brand grouping

```
╔═════════════════════════════════════════════════════════════════╗
║ [  All  ] [ ●Soda● ] [ Water ] [ Sports ] [ Tea ] [ Energy ]   ║
╚═════════════════════════════════════════════════════════════════╝

  20 oz Bottles (32 SKUs)
  ────────────────────────
  Coke  ·  Pepsi  ·  Canada Dry  ·  Dr Pepper  ·  Sprite
  [rows...]

  12 oz Cans (18 SKUs)
  ─────────────────────
  Coke  ·  Pepsi  ·  Schweppes
  [rows...]

  2-Liter (8 SKUs)
  ─────────────────
  [rows...]
```

### Energy & Coffee selected — brand grouping

```
╔═════════════════════════════════════════════════════════════════╗
║ [ All ] [ Soda ] [ Water ] [ Sports ] [ Tea ] [ ●Energy●  ]    ║
╚═════════════════════════════════════════════════════════════════╝

  Monster (8 SKUs)
  ─────────────────
  ┌─────────────────────────────────────────────────────────────┐
  │ Monster Energy Original   24/16oz    $42.99             [+] │
  └─────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────────┐
  │ Monster Zero Ultra        24/16oz    $42.99             [+] │
  └─────────────────────────────────────────────────────────────┘
  [more...]

  Celsius (6 SKUs)
  ─────────────────
  [rows...]

  Red Bull (4 SKUs)
  ──────────────────
  [rows...]
```

### Sports & Hydration selected — subline / brand grouping

```
╔═════════════════════════════════════════════════════════════════╗
║ [ All ] [ Soda ] [ Water ] [ ●Sports● ] [ Tea ] [ Energy ]     ║
╚═════════════════════════════════════════════════════════════════╝

  Gatorade  (14 SKUs)
  ────────────────────
  Thirst Quencher  ·  Gatorade Zero  ·  G2  ·  Endurance
  [rows...]

  BodyArmor  (6 SKUs)
  ────────────────────
  BodyArmor Sports  ·  BodyArmor LYTE
  [rows...]

  Powerade  (4 SKUs)
  ───────────────────
  [rows...]
```
