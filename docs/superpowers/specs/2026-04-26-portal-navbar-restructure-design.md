# Portal navbar + pages restructure — Design Spec

**Status:** approved during conversation, going straight to implementation
**Date:** 2026-04-26
**Builds on:** [`docs/superpowers/specs/2026-04-25-homepage-flow-redesign-design.md`](./2026-04-25-homepage-flow-redesign-design.md), [`docs/design-system.md`](../../design-system.md)

## Why

The homepage is doing too much. It owns the welcome moment, the start-order
fork, the FYP feed, the order history, and the account stats — all in one
scroll. After multiple iterations the start-order surface keeps getting
heavier (unified ordering panel with Resume + Reorder list + Usuals + Scratch).
That's structurally wrong: ordering is a *recurring* job, the homepage is a
*landing* surface. They want different shapes.

Also: there's no canonical place to manage usuals, no proper Order History
page, and no way to start an order from anywhere except the homepage.

This restructure moves jobs to the right places:

- **Start order** becomes a navbar action available from any portal page,
  opening a drawer with the four-path fork inside.
- **Order history** becomes its own page (`/portal/[token]/orders`).
- **Manage usuals** lives at `/portal/[token]/catalog` — a search + filter +
  product list with per-product In-my-usuals toggles.
- **Homepage slims down** to: welcome moment + Resume strip (when relevant) +
  FYP feed + account stats.

## Goals

1. **Navbar gains real navigation.** Hamburger on mobile, explicit links on
   desktop. New entries: Start order (action), Order history (link), Catalog
   (link). Account stays as the icon.
2. **`<StartOrderDrawer>`** — Panel `bottom-sheet` containing: delivery date
   picker, top 5 recent orders (each a one-tap clone), one-tap "Add my
   usuals," fallback "Start with empty draft." Available from anywhere.
3. **`/portal/[token]/orders` page** — full list of submitted/delivered
   orders with filters, eye-icon Preview, and Reorder per row.
4. **`/portal/[token]/catalog` page** — search + filter + product list,
   each product has a toggle to add/remove from the customer's usuals.
   Pure manage mode; not an ordering surface.
5. **Slim homepage** — welcome + Resume strip (with "Other drafts" list when
   ≥ 2 drafts) + FYP feed + account stats.

## Non-goals

- No backend wiring: drawer actions, usuals toggle, history filters all use
  mock state and `// TODO` comments.
- No changes to order-builder UI (`/portal/[token]/order/[date]/...`).
- No changes to admin announcements pages.
- No deletion of `<StartOrderFork>` yet — rename and repurpose as
  `<StartOrderDrawer>`'s body so the conflict-detection logic carries over.
- No `Doctrine Rule 12` violation: navbar adds nav items but stays static
  (`border-b bg-background`, no `fixed`, no glass), still under 64 lines.

## Navbar — `<PortalTopBar>` changes

### Mobile (<768px)

```
┌─────────────────────────────────────────┐
│ [≡]   Universal Beverages         [👤] │
└─────────────────────────────────────────┘
       Tapping ≡ opens a side-sheet menu:
       ╔════════════════════════════════╗
       ║ ✕                              ║
       ║ ────────────────────────────── ║
       ║ ▸ Start order                  ║   ← primary, accent
       ║   Order history                ║
       ║   Catalog                      ║
       ║   Account                      ║
       ╚════════════════════════════════╝
```

### Desktop (≥768px)

```
┌────────────────────────────────────────────────────────────────────┐
│ Universal Beverages   Order history   Catalog   [Start order ▸][👤]│
└────────────────────────────────────────────────────────────────────┘
```

- "Start order" is a primary `<Button variant="accent" size="sm">`. It opens
  the `<StartOrderDrawer>`.
- "Order history" and "Catalog" are text links with active-state styling
  (matched against `usePathname()`).
- Brand link demotes to muted text (existing behavior).
- Account icon retains its position on the right.

## `<StartOrderDrawer>`

A `<Panel variant="bottom-sheet" width="content">`. Available from anywhere
in the portal via the navbar's "Start order" button.

```
┌─────────────────────────────────────┐
│  ────                               │ ← drag handle (mobile)
│  Start an order                  ✕  │
│ ─────────────────────────────────── │
│  Delivery date                       │
│  [📅  Thu, May 1, 2026  ▾]           │
│                                     │
│  Add items from a recent order      │
│  ┌─────────────────────────────┐    │
│  │ ●  Apr 25 · 3 items · $79  →│    │  ← top 5 recent
│  │ ●  Apr 18 · 18 items · $164→│    │     each tap = clone
│  │ ●  Apr 11 ·  9 items · $84 →│    │
│  │ ●  Apr 4  · 24 items · $214→│    │
│  │ ●  Mar 28 · 12 items · $98 →│    │
│  └─────────────────────────────┘    │
│                                     │
│  Add your usuals                    │
│  [★ Add 7 items as usuals  →]       │  ← single accent button
│  [Manage usuals →]                  │  ← link to /catalog
│                                     │
│  ─────────────────────────────────  │
│  [Start with empty draft →]         │  ← fallback
└─────────────────────────────────────┘
```

### Behavior

- **Date picker**: defaults to next-available delivery date. Opens the
  same `<input type="date">` we use elsewhere.
- **Recent orders**: tap = create new draft for the picked date with the
  source order's items cloned in, then `router.push(buildCustomerOrderDeepLink)`.
- **Add usuals**: tap = create new draft for the picked date with all
  the customer's usuals pre-loaded. The button label includes the usuals
  count when known.
- **Manage usuals**: link to `/portal/[token]/catalog`.
- **Start empty**: tap = create empty draft for the picked date and drop
  into the order builder.
- **Conflict handling**: if a draft already exists for the picked date,
  any of the above paths trigger the existing confirm-replace dialog
  pattern (carry over from `<StartOrderFork>`).

## `/portal/[token]/orders` — Order History page

Replaces the existing redirect stub.

```
┌─────────────────────────────────────────────┐
│ ← Universal Beverages              [👤]     │ ← navbar (with active state)
├─────────────────────────────────────────────┤
│ Order history                               │ ← <PortalPageHeader>
│                                             │
│ [All] [Submitted] [Delivered]               │ ← Tabs filter
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ● Apr 25 · Submitted · 3 items · $79  →│ │ ← row uses existing
│ │   [👁] [Reorder] [CSV] [Cancel]        │ │   <OrdersList variant=past>
│ └─────────────────────────────────────────┘ │   pattern
│ ┌─────────────────────────────────────────┐ │
│ │ ● Apr 18 · Delivered · 18 items · $164→│ │
│ └─────────────────────────────────────────┘ │
│ ...                                         │
└─────────────────────────────────────────────┘
```

Reuses `<OrdersList>` since it already implements row rendering, reorder
dialog, and CSV. Tabs filter by status. Future: date range filter,
pagination — out of scope here.

## `/portal/[token]/catalog` — Manage Usuals page

```
┌─────────────────────────────────────────────┐
│ ← Universal Beverages              [👤]     │
├─────────────────────────────────────────────┤
│ Catalog                                     │
│ Toggle items to keep them in your usuals    │ ← description
│                                             │
│ [🔍 Search products…              ]         │
│ [Brand ▾] [Size ▾]                          │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [img] Coca-Cola Original                │ │ ← product row
│ │       24/12oz · $38.99       [✓ Usual]  │ │
│ ├─────────────────────────────────────────┤ │
│ │ [img] Coca-Cola Zero Sugar              │ │
│ │       24/12oz · $38.99       [Add]      │ │
│ ├─────────────────────────────────────────┤ │
│ │ [img] Sprite                            │ │
│ │       24/12oz · $38.99       [✓ Usual]  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- Each product row: thumbnail (or placeholder), brand + name, pack/size,
  price, toggle button.
- Toggle: `[✓ Usual]` (filled accent) when in usuals; `[Add]` (outline)
  when not. Tap flips it.
- Mock mode: hardcoded ~12 products so search/filter/toggle visibly work.
- TODO entry for: real product query + per-customer usuals join + toggle
  PATCH endpoint.

## Slim homepage

```
┌─────────────────────────────────────────────┐
│ Welcome moment (greeting + date + question) │
│                                             │
│ ┌─────────────────────────────────────────┐ │ ← Resume strip,
│ │ ●  Resume draft for May 1 · 3 items  →  │ │   only when ≥ 1 draft
│ └─────────────────────────────────────────┘ │
│ Other drafts                                │ ← muted subheading,
│  ●  Draft for May 8 · 12 items           →  │   only when ≥ 2 drafts
│  ●  Draft for May 15 · 4 items           →  │
│                                             │
│ ── below-fold panel  bg-muted/30 ─────────  │
│ FOR YOU                                     │
│ [announcement cards]                        │
│ ── Account stats ───────────────────────    │
└─────────────────────────────────────────────┘
```

- No "Start order" CTA on the homepage. Navbar owns that path now.
- No `<OrdersList>` and no `<PastOrdersSection>` on the homepage — those
  move to `/orders`.
- Resume strip: when a draft exists, the primary draft (soonest delivery
  date) is the accent block. Additional drafts (if any) listed below as
  quiet rows under a small "Other drafts" subheading.
- FYP feed and AccountStatsCard remain.

### Primary-draft selection

`primary = drafts[0]` after sorting by `delivery_date asc`. Soonest
delivery date wins; ties broken by `updated_at` desc.

## Code-change list

### Modify

| Path | Change |
|---|---|
| `components/layout/portal-top-bar.tsx` | Add Start-order button (opens drawer), mobile hamburger menu, desktop links to /orders and /catalog. Stays `border-b bg-background`, no fixed, no glass. |
| `app/(portal)/portal/[token]/page.tsx` | Slim: drop OrdersList + PastOrdersSection, replace `<StartOrderFork>` with `<HomepageDraftStrip>`. Keep welcome + FYP + stats. |
| `app/(portal)/portal/[token]/orders/page.tsx` | Replace redirect with real Order History page. |
| `docs/handoff/homepage-redesign.md` | Append entries for new mocks (drawer actions, usuals toggle, history filters). |

### Create

| Path | What |
|---|---|
| `components/portal/start-order-drawer.tsx` | Bottom-sheet drawer. Date picker + 5 recent orders + usuals + scratch + manage-usuals link. Uses Panel primitive. Conflict handling carries over from StartOrderFork. |
| `components/portal/homepage-draft-strip.tsx` | Slim homepage strip: primary Resume block + "Other drafts" list. No new-order affordance. |
| `app/(portal)/portal/[token]/catalog/page.tsx` | Manage Usuals page (search + filter + toggle list). |
| `components/portal/manage-usuals-list.tsx` | The product list with toggle buttons. Client component; mock state. |

### Delete (after migrations)

| Path | Why |
|---|---|
| `components/portal/start-order-fork.tsx` | Replaced by `<StartOrderDrawer>`. |
| `components/portal/reorder-list.tsx` | Replaced by inline list inside the drawer. The OrderPreviewSheet inside it can survive — extract to its own file or roll into the new drawer. |

Both deletes happen as a follow-up cleanup commit, not in the same PR
that introduces the new code, so the diff stays scoped.

## Doctrine compliance

- **Rule 1** — single figure: each new surface still has one figure
  (drawer's date picker is the lead; Resume block on homepage is the
  figure when present; catalog list rows are equal-weight by design).
- **Rule 9** — Panel variants: drawer uses `<Panel variant="bottom-sheet">`;
  navbar's mobile menu uses `<Panel variant="side-sheet">` (consistent
  with admin nav patterns).
- **Rule 12** — navbar stays page chrome: still `border-b bg-background`,
  still under 64 lines after the additions, no fixed positioning, no
  glass. The Start-order button is page chrome's primary CTA, but it's
  contained — not glass-blurred or floating.

## Verification

### Static checks

`npm run typecheck && npm run lint && npm run build` all clean.

### Touch checklist

- [ ] Navbar on mobile: hamburger menu opens with Start order / Order history / Catalog / Account
- [ ] Navbar on desktop: links inline, Start order as accent button on the right
- [ ] Start-order drawer opens from any page when the navbar button is tapped
- [ ] Drawer shows date picker + top 5 recent orders + usuals button + scratch fallback
- [ ] `/portal/[token]/orders` renders the order history (not the redirect)
- [ ] `/portal/[token]/catalog` renders the manage-usuals list with toggle states
- [ ] Homepage no longer shows the unified ordering panel
- [ ] Homepage Resume strip surfaces the primary draft (soonest delivery)
- [ ] Homepage shows "Other drafts" list only when ≥ 2 drafts exist
- [ ] FYP feed and AccountStatsCard still render below the fold

## Out of scope (handoff entries to add)

| # | File | Mock | Blocked on |
|---|---|---|---|
| 15 | `components/portal/start-order-drawer.tsx` | drawer actions all `window.alert` | clone_order / apply_usuals / draft-create endpoints |
| 16 | `components/portal/manage-usuals-list.tsx` | hardcoded 12 products + local toggle state | products query + customer_products usuals column + PATCH endpoint |
| 17 | `app/(portal)/portal/[token]/orders/page.tsx` | history shown via `<OrdersList>`; tab filter is local-only | tab → query param wiring or RSC filter |

## Plan format

Single PR. Implementation order:

1. `<StartOrderDrawer>` (component only, no wiring yet)
2. `<PortalTopBar>` rebuild (Start order + menu + links)
3. `/portal/[token]/orders` page
4. `<ManageUsualsList>` + `/portal/[token]/catalog` page
5. `<HomepageDraftStrip>` + slim homepage
6. Spec + handoff doc updates
7. Verify
8. Commit
