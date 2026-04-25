# Order Page — Concepts Comparison & Recommendation

> **Superseded as a build target 2026-04-25.** None of the three "FamilyTabStrip + CartSummaryBar" concepts compared below match what shipped. The shipped order page uses six **FamilyCards on the page** that open a `<FamilySheet>` (a `<Panel variant="bottom-sheet">`) — there is no FamilyTabStrip. The cart bar is `<CartReviewSurface>`'s closed state — a fused cart bar + review drawer that animates as one continuous surface; there is no standalone `<CartSummaryBar>`.
>
> Read [`docs/design-system.md`](../design-system.md) for the live reference. This document is retained as historical record of the design exploration.

---

## Quick-glance comparison

```
                     Concept A           Concept B           Concept C
                     Tab strip           Left sidebar        2-column split
                     (inline, sticky)    (persistent)        (usuals + browse)
─────────────────────────────────────────────────────────────────────────────
Mobile layout        Tab strip           Tab strip fallback  Tab strip fallback
Desktop layout       Full-width tabs     Persistent sidebar  Split columns
Family switching     Scroll to top,      Sidebar always      Tabs always
                     tab is sticky       visible             visible (right col)
Usuals placement     Top, tile grid      Top, tile grid      Left column (always)
Cart summary         Fixed footer bar    In sidebar          Fixed footer row
Filter panel         Collapse inline     Collapse inline     Collapse inline
Responsive effort    Low                 Medium              High
Familiarity          High (tabs common)  Medium (sidebar)    Low (uncommon)
Recommended for      All customers       Power users         High-usuals accounts
```

---

## Recommendation: build Concept A first

Concept A is the right first implementation because:

1. **Same component on mobile and desktop** — `FamilyTabStrip` is a single
   component with no layout-switch logic. Ship it once, it works everywhere.

2. **Sticky behaviour is established** — the admin pages already use sticky
   headers (`sticky top-[49px]`), so this pattern is familiar and tested.

3. **Lowest risk** — Concepts B and C require layout restructuring that touches
   `PortalPageHeader`, `CartSummaryBar`, and potentially the scroll container.
   Concept A only adds one new component above the existing search bar.

4. **Upgradable later** — Concept B's sidebar and Concept C's split columns can
   be layered on as responsive variants of the same family state. The underlying
   `useCatalog` changes are identical regardless of which layout is used.

---

## What changes in Concept A vs today

```
TODAY                              CONCEPT A
─────────────────────────────────  ─────────────────────────────────
[Deals (collapsible)]              [moved to homepage]
[Favorites / Usuals grid]          [Favorites / Usuals grid]   (same)
[All products header + count]      [Browse products header]    (renamed)
  [Search bar]  [Filter ≡]           [FamilyTabStrip]          (NEW)
  [FilterCollapsePanel]              [Search bar]  [Filter ≡]
  [CatalogGrid]                      [FilterCollapsePanel]
                                     [CatalogGrid]
[CartSummaryBar]                   [CartSummaryBar]            (same)
```

Net: 1 component added (`FamilyTabStrip`), 1 section removed (deals),
1 label changed ("All products" → "Browse products"), count span removed.

---

## FamilyTabStrip anatomy

```
┌──────────────────────────────────────────────────────────────────┐
│ [  All  ] [ Soda ¹² ] [ Water ⁸ ] [ Sports ¹⁴ ] [ Tea ⁹ ] [→] │
└──────────────────────────────────────────────────────────────────┘
   ↑          ↑            ↑             ↑
   no badge   count badge  count badge   active: navy fill, white
              10px super   10px super    inactive: border, muted

← overflow-x-auto, no scrollbar, scroll snaps to active tab on change
```

Active tab auto-changes:
- Soda selected → `groupBy` becomes `size-brand`
- Energy / Tea / Sports / Water / Other → `groupBy` becomes `brand`
- All → `groupBy` restores to user's `defaultGroupBy`

---

## State machine for family + groupBy

```
User action              selectedFamily    groupBy applied
─────────────────────────────────────────────────────────
(initial load)           'all'             profile.default_group
Tap "Soda"               'soda'            'size-brand'  (auto)
Tap "Water"              'water'           'size-brand'  (auto)
Tap "Sports"             'sports_hydration''brand'       (auto)
Tap "Tea"                'tea_juice'       'brand'       (auto)
Tap "Energy"             'energy_coffee'   'brand'       (auto)
Tap "Other"              'other'           'brand'       (auto)
Tap "All"                'all'             profile.default_group
User overrides groupBy   any               user's choice (pinned)
(via filter panel)
```

---

## Open questions before building

1. **Tab label length** — "Sports & Hydration" is too long for a pill tab on
   a 375px screen. Short forms: "Sports", "Tea", "Energy". Confirm these labels
   are clear enough without the full name.

2. **"All" tab count badge** — show total product count on "All" tab, or omit?
   The plan says "only for non-All tabs". Confirm.

3. **Family for existing products** — all current products will land in "Other"
   until admins assign families. Should the initial release auto-assign based
   on brand name heuristics, or leave it all in "Other" until manually set?

4. **Filter panel + family tab interaction** — if a user is on "Soda" tab and
   then opens filters and changes groupBy, does the family tab stay selected?
   Recommendation: yes, family filter and groupBy are independent axes.

5. **Search scope** — does search scan all families or only the selected family?
   Recommendation: scoped to selected family (auto-clears when switching tabs
   feels disruptive; scoped search is faster for large catalogs).
