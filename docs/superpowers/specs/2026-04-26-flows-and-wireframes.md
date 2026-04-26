# Flows & Wireframes — Screen-by-Screen

> **⚠️ Status: most flows are now real.** The eight wireframes named here
> shipped (B1–B8 in the roadmap), plus a ninth `<PromoSheet>` drawer that
> superseded the original "/promo route" pattern. Pallet-related flows
> (`<PalletCard>`, `<PalletDealsManager>`) were retired entirely when
> pallets merged into announcements — see migration `202604260005`.
> Customer-group cascading overrides (a feature added later) are not in
> this doc; see `docs/handoff/state-and-next-steps-2026-04-26.md` for
> current state.

Companion to [`2026-04-26-promo-and-portal-roadmap.md`](2026-04-26-promo-and-portal-roadmap.md).
Where the roadmap names the work, this doc walks each flow screen by
screen and provides ASCII wireframes for any **new** surface (a new
screen, modal, sheet, or section that doesn't exist in code today).
Existing surfaces are referenced by component path — they're already
real and don't need redrawing.

**Convention used throughout:**

- Each step is one *visible state* the user is in. Steps are numbered
  per flow (`C1.1`, `C1.2`, …).
- Existing components are linked. New surfaces have a wireframe block
  marked `[NEW]`.
- Tap counts include the step that *triggers* the next state, so total
  taps = number of "→ tap X" arrows between Step 1 and the outcome.
- Wireframes are mobile-first (375px target). Desktop deltas are
  called out where they matter.

**Glossary:**

- **`<Panel>`** — the project's modal primitive. Three variants:
  `centered` (desktop dialog), `bottom-sheet` (mobile drawer up),
  `side-sheet` (slides in from edge). [`components/ui/panel.tsx`](../../../components/ui/panel.tsx).
- **Primary draft** — the customer's draft order with the soonest
  delivery date. Where steppers autosave to.
- **Tap budget** — best/acceptable counts per the roadmap.

---

## Customer flows (C1 – C6)

### C1 — Resume + submit (the dominant flow)

**Tap budget: best 4, acceptable 6. All states real today.**

#### C1.1 — Homepage with one draft

**Surface:** [`app/(portal)/portal/[token]/page.tsx`](../../../app/(portal)/portal/[token]/page.tsx)
+ [`HomepageStartSection`](../../../components/portal/homepage-start-section.tsx).

What's on screen (mobile):

```
┌─────────────────────────────────────┐
│  ☰  Universal Beverages    📞 Dave  │
├─────────────────────────────────────┤
│                                     │
│  Good morning, Maya 👋              │
│  Tuesday, May 5 · 8:14 AM           │
│  What can we get for Maya Deli      │
│  today?                             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ●  Resume draft for Tue May 5   │ │  ← BIG ACCENT
│ │    12 items                  →  │ │
│ └─────────────────────────────────┘ │
│  Or start a new order →             │
│                                     │
│  ─── For you ───                    │
│  [ Announcement card 1 ]            │
│  [ Announcement card 2 ]            │
│  …                                  │
│                                     │
├─────────────────────────────────────┤
│   🏠 Home  📋 Orders  👤 Account    │
└─────────────────────────────────────┘
```

**→ Tap "Resume draft" block (1 tap)** → C1.2.

#### C1.2 — Order builder

**Surface:** [`OrderBuilder`](../../../components/catalog/order-builder.tsx).
Has search header, family tabs, product tiles with floating steppers,
fixed cart bar at bottom.

Customer adjusts quantities — each tap autosaves at 300ms debounce
([`useAutoSavePortal`](../../../lib/hooks/useAutoSavePortal.ts)).
Quantity 0 → DELETE. No explicit "save" needed.

**→ Tap Review on the cart bar (1 tap)** → C1.3.

#### C1.3 — Cart-review surface (lifted state)

**Surface:** [`CartReviewSurface`](../../../components/catalog/cart-review-surface.tsx).
The cart bar lifts into a 68dvh panel with line items, total, Submit
button.

**→ Tap Submit (1 tap)** → PATCH `/api/portal/orders/[id]/status` with
`{status: 'submitted'}` → redirects to `/portal/[token]/orders` →
**done.**

**Total: 3 taps from homepage to "Order submitted"** (Resume → Review
→ Submit), assuming no quantity edits. Each adjustment is a tap on
top.

---

### C2 — First-time submit (no drafts, no usuals, no history)

**Tap budget: best 7, acceptable 9. State today: partial — Step C2.3
fires `window.alert`.**

#### C2.1 — Homepage in empty state

**Surface:** same homepage RSC, "no drafts" branch of
[`HomepageStartSection`](../../../components/portal/homepage-start-section.tsx#L39-L57).

```
┌─────────────────────────────────────┐
│  ☰  Universal Beverages    📞 Dave  │
├─────────────────────────────────────┤
│                                     │
│  Good morning, Maya 👋              │
│  Tuesday, May 5 · 8:14 AM           │
│  What can we get for Maya Deli      │
│  today?                             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  🛒  Start an order          →  │ │  ← BIG ACCENT
│ └─────────────────────────────────┘ │
│                                     │
│  ─── For you ───                    │
│  [ Announcement card 1 ]            │
│  …                                  │
└─────────────────────────────────────┘
```

**→ Tap "Start an order" (1 tap)** → C2.2.

#### C2.2 — StartOrderDrawer (existing, partly broken)

**Surface:** [`StartOrderDrawer`](../../../components/portal/start-order-drawer.tsx)
as a `<Panel variant="bottom-sheet">`.

For a brand-new customer, three sections show different states:

- **Delivery date** — defaults to next-available, tappable to change.
- **Add items from a recent order** — *empty list, hidden entirely*
  (component already gates on `recentOrders.length > 0` at line 185).
- **Add your usuals** — disabled button, label reads "You haven't
  picked any usuals yet" (line 234-236).
- **Start with empty draft** — the working path.

```
┌─────────────────────────────────────┐
│  Start an order                ✕    │
├─────────────────────────────────────┤
│                                     │
│  DELIVERY DATE                      │
│  ┌─────────────────────────────┐    │
│  │  📅  Tuesday, May 5      ▾  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ADD YOUR USUALS                    │
│  ┌─────────────────────────────┐    │
│  │  ✨ You haven't picked       │    │
│  │     any usuals yet           │    │  ← DISABLED
│  └─────────────────────────────┘    │
│  Manage usuals →                    │
│                                     │
│  ─────────────────────                │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Start with an empty draft → │    │
│  └─────────────────────────────┘    │
│                                     │
│  💡 First time? Mark items as       │  ← NEW HINT
│     usuals from the catalog so      │     (only when
│     you can one-tap reload them     │     usualsCount=0
│     next week.                      │     AND no recent
│                                     │     orders)
└─────────────────────────────────────┘
```

The hint at the bottom is **NEW** (not in the component today). It's
a single conditional: render only when `usualsCount === 0 &&
recentOrders.length === 0`. Cheap; no new surface.

**→ Tap "Start with an empty draft" (1 tap)** → C2.3.

#### C2.3 — Empty draft created → C1.2 (order builder)

Today: fires `window.alert` at
[`start-order-drawer.tsx:135`](../../../components/portal/start-order-drawer.tsx#L135).
**Blocked on W6.**

After W6: POST `/api/portal/orders` with `pickedDate` → returns new
draft id → router push to the order builder for that date. Then C1.2
→ C1.3 takes over.

---

### C3 — Promo-tap → in draft (the salesman's lever)

**Multiple sub-flows depending on card type.**

Five card types render in the homepage's "For you" stack
([`AnnouncementsStack`](../../../components/portal/announcements-stack.tsx)).
The work the customer does after tapping varies:

| Card type | Tap path | Today |
|---|---|---|
| Text / Image / Image+text → product CTA | Card → **promo drawer (NEW)** → pre-select → Add to order | Replaces old route — see B8 below |
| Text / Image / Image+text → URL CTA | Card → external tab | Real |
| Product spotlight (has draft) | Tap "Add to order" → qty 1 inline | **Mock — no autosave (B2)** |
| Product spotlight (no draft) | Tap → date picker → draft created → qty 1 | **Mock — `window.alert` (B1)** |
| Specials grid | Stepper on tile | **Mock — local state only (B3)** |

#### Why the promo *drawer*, not the promo *route*

**Previous design (and what's in code today):** the editorial CTA
was a `<Link>` to `/portal/[token]/promo/[id]` — a full route with
[`PromoProductGrid`](../../../components/portal/promo-product-grid.tsx)
and a back-arrow header. Steppers autosaved into the primary draft on
each tap; there was no commit affordance and the back arrow returned
to the homepage. The result: the customer left the surface without
ever feeling like they "completed" the promo interaction, and there
was no chance to confirm "yes, add these to my order."

**New design:** the CTA opens a `<Panel variant="bottom-sheet">` *over*
the homepage. The customer pre-selects items inside the drawer. A
primary button at the bottom commits the selection (bulk-saves into
the primary draft, creating the draft if needed) and closes the
drawer. The customer stays on the homepage with a toast confirming the
add. The `/promo/[id]` route is **deleted** — the announcement CTA is
the only entry point, and the surface lives at the click site.

This changes one mechanical thing: stepper taps inside the drawer **no
longer autosave per-tap**. They mutate local state until the customer
hits "Add to order," at which point the entire selection is bulk-sent
to the existing items endpoint. This is consistent with the
"deliberate commit" model the customer's mental model already uses for
the cart-review surface.

This is **B8** in the build plan. New build item; replaces old "stays a route" assumption.

#### C3.1 — Editorial card with product CTA → opens drawer

**Surface:** [`AnnouncementCard`](../../../components/portal/announcement-card.tsx)
renders one of `TextCard` / `ImageBannerCard` / `ImageTextCard`. The
existing `<CtaLink>` helper changes shape:

- For `cta_target_kind in ('product', 'products')`: renders a
  `<button>` (not a `<Link>`) that opens the new `<PromoSheet>`
  drawer with the resolved product list.
- For `cta_target_kind === 'url'`: unchanged — external `<a>` opens
  in a new tab.

**→ Tap CTA (1 tap)** → C3.2.

#### C3.2 — Promo drawer (`<PromoSheet>`) `[NEW]`

**This drawer does not exist today.** Replaces the
`/portal/[token]/promo/[id]` route entirely.

**Built on the `<CartReviewSurface>` shell.** The same Panel-bottom-sheet
chrome — header with close, scrollable body, sticky footer with one
accent button — is reused. Only the body content differs (a product
grid instead of a line-item list) and the footer button is stateful
(see below).

**Footer button — stateful grammar (the load-bearing UX detail):**

The button copy changes through three states as the customer
selects:

| State | Button copy | Style |
|---|---|---|
| 0 items selected | `Select products…` | Muted / disabled |
| 1+ items selected, has draft | `Added items 2/5 — Continue to order page?` | Accent |
| 1+ items selected, no draft | `Added items 2/5 — Start a Tuesday order?` | Accent |

**`2/5` = `{itemsWithQty>0} / {totalProductsInPromo}`.** It's a
selection-progress signal — not a cart total. As soon as one tile has
a non-zero qty, the counter ticks; when all five have a qty, it
reads `5/5`. (The total qty across all tiles, for ordering purposes,
is irrelevant to this counter.)

The button is doing two jobs at once:

1. **Acknowledgement** — "I see you, I've registered N items."
2. **Forward motion** — "Tap to commit AND go to the order builder."

The `?` at the end is the conversational tell — it's asking the
customer for permission, not announcing the action. This matches the
voice of "your salesman who knows your business" we want everywhere
else in the portal.

**Wireframe — has draft, mid-selection:**

```
┌─────────────────────────────────────┐
│  Summer Launch                  ✕   │  ← header (reuses
│  5 products · for Tue May 5         │     CartReviewSurface
├─────────────────────────────────────┤     header pattern)
│                                     │
│  ┌────────┐  ┌────────┐             │
│  │  -15%  │  │        │             │  ← callout pill (B9)
│  │ [img]  │  │ [img]  │             │     when present
│  │ Cherry │  │ Sprite │             │
│  │ Coke   │  │  2L    │             │
│  │ $14.99 │  │ $3.49  │             │
│  │ [-2 +] │  │  [ + ] │             │  ← floating stepper
│  └────────┘  └────────┘             │     starts as "+",
│   ✓                                 │     becomes [-N+] on tap;
│                                     │     ✓ corner mark when qty>0
│  ┌────────┐  ┌────────┐             │
│  │ [img]  │  │  NEW   │             │  ← another callout pill
│  │  …     │  │ [img]  │             │
│  │ [-1 +] │  │  [ + ] │             │
│  └────────┘  └────────┘             │
│   ✓                                 │
│                                     │
│  ┌────────┐                          │
│  │ [img]  │                          │
│  │  [ + ] │                          │
│  └────────┘                          │
│                                     │
├─────────────────────────────────────┤  ← sticky footer
│  ┌─────────────────────────────┐    │     (reuses
│  │  Added items 2/5 —           │    │     CartReviewSurface
│  │  Continue to order page?  →  │    │     footer pattern)
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Wireframe — initial state (0 selected):**

```
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │  Select products…            │    │  ← muted, disabled
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Wireframe — no-draft, mid-selection:**

```
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │  Added items 2/5 —           │    │
│  │  Start a Tuesday order?   →  │    │  ← creates draft on tap,
│  └─────────────────────────────┘    │     then routes to builder
│  We'll deliver Tue May 5. Change ▾  │  ← tappable date hint
└─────────────────────────────────────┘
```

**Behavior:**

- Tapping `+` on a tile sets local qty to 1, expands stepper to
  `[-1+]`, lights a small `✓` corner mark on the tile. No network
  call.
- Tapping `+`/`-` adjusts local qty. Going to 0 collapses to `+` and
  removes the `✓`.
- Tile body tap (not the stepper) opens
  [`<ProductPopout>`](../../../components/catalog/product-popout.tsx)
  — same popout as everywhere else. Popout's stepper writes to the
  same local state.
- The footer button is the **only** thing that talks to the network.

**→ Tap the footer button (1 tap):**
- *Has draft:* bulk PUT to
  [`/api/portal/orders/[id]/items`](../../../app/api/portal/orders/[id]/items/route.ts)
  with all non-zero quantities → drawer closes → **router pushes to
  the order builder for the primary draft date** (the "Continue to
  order page?" promise). The customer lands in C1.2.
- *No draft:* POST `/api/portal/orders` with picked date → on success
  bulk PUT items into the new draft → drawer closes → router pushes
  to the order builder.

**Why "Continue to order page?" instead of "Add and stay":** the
customer who tapped a promo CTA is in *acquisition mode* — they're
acting on a recommendation. The most useful next step is the order
builder, where they can review what they just added in context with
their other items and adjust. Dropping them back on the homepage
means they have to tap "Resume draft" anyway. We collapse two
actions (commit + navigate) into one.

**Tap budget:** 2 (CTA → footer button) for the dominant case;
stepper taps are the *value* the customer is producing, not chrome.

**Why drawer beats route:**

- **Stay in flow.** Customer never navigates away during selection.
  The announcement card is still behind the drawer's backdrop, so
  the connection between "I tapped that thing" and "I'm picking
  items" is preserved.
- **Commit affordance.** The stateful button gives the customer a
  clear "I'm done" moment. The old route had no equivalent — autosave
  ran silently with no completion signal.
- **Reuses CartReviewSurface.** Same Panel chrome, same header
  pattern, same sticky-footer-with-button. New code is just the body
  grid + the button-state logic.
- **Cheaper backend.** Bulk-save is one round-trip instead of N
  per-tap autosaves.
- **Easier exit.** Swipe-down or tap-outside closes the drawer
  without saving (per Panel doctrine).

**Discard semantics:** closing the drawer with the ✕ button or by
swipe-down discards the local selection. No warning needed —
nothing was sent to the server. (Compare to the old route where
every tap was a permanent save.)

**Stale-product handling:** if a UUID in
`cta_target_product_ids` (or `product_ids` for fallback resolution)
no longer exists in the `products` table, the resolver renders the
products that *do* exist plus a muted notice line above the grid:
*"Some products in this promo are no longer available."* Reason:
honest about the gap without forcing the salesman to clean up the
announcement immediately. The same rule applies on the
`SpecialsGridCard` — render the available tiles, surface a one-line
notice if any are missing.

#### C3.3 — Product spotlight inline conversion

**Surface:** `ProductSpotlightCard` inside `AnnouncementCard`.

```
┌─────────────────────────────────────┐
│  ★ FEATURED PRODUCT                 │
│                                     │
│  ┌──────┐  Cherry Coke 12-pack      │
│  │ [img]│  12 cans · $14.99         │
│  │      │  "Customers are asking    │
│  └──────┘   for it again."          │
│                                     │
│              [ Add to order ]       │  ← accent button
└─────────────────────────────────────┘
```

**→ Tap Add to order (1 tap):**
- *Has draft:* card mutates in place, button replaced by stepper.
  **Today: visually works but no autosave** (uses local `useState(0)`
  at [`announcement-card.tsx:213`](../../../components/portal/announcement-card.tsx#L213)).
  **Blocked on B2.**
- *No draft:* C3.4.

#### C3.4 — Spotlight no-draft date picker `[NEW]`

**This modal does not exist today.** Currently fires `window.alert`
at [`announcement-card.tsx:218-224`](../../../components/portal/announcement-card.tsx#L218).

**Built as `<Panel variant="bottom-sheet">`. Wireframe:**

```
┌─────────────────────────────────────┐
│  Add to order                  ✕    │
├─────────────────────────────────────┤
│                                     │
│  Cherry Coke 12-pack                │
│  $14.99 each                        │
│                                     │
│  When should we deliver?            │
│  ┌─────────────────────────────┐    │
│  │  📅  Tuesday, May 5      ▾  │    │
│  └─────────────────────────────┘    │
│                                     │
│  We'll start a new order for that   │
│  date and add 1 case of Cherry      │
│  Coke. You can add more from the    │
│  catalog after.                     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Add to a Tuesday order      │    │  ← accent
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**→ Tap "Add to a Tuesday order" (1 tap)** → POST `/api/portal/orders`
with picked date → spotlight card re-renders with stepper at qty 1
(autosave already ran for the line item) → sheet closes.

Why a sheet and not a date picker inline: the customer's mental model
is "I'm committing to start an order to get this product." Surfacing
that explicitly is worth the one extra tap. Reuses the same
`<Panel variant="bottom-sheet">` primitive as `<StartOrderDrawer>`.

**Implements B1.** Tap budget: 2 (Add to order → confirm date).

#### C3.5 — Specials grid

**Surface:** `SpecialsGridCard` inside `AnnouncementCard`. Renders a
3-up grid of product tiles with floating steppers, **inline on the
homepage** (no drawer — see note below).

**Wireframe (post-B3 + B9):**

```
┌─────────────────────────────────────┐
│  ★ Specials this week               │
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ -15% │  │      │  │ NEW  │       │  ← callout pills (B9)
│  │[img] │  │[img] │  │[img] │       │     authored by salesman
│  │      │  │      │  │      │       │     via badge_overrides
│  │ [+]  │  │ [+]  │  │ [+]  │       │  ← tap "+" → autosave (B3)
│  └──────┘  └──────┘  └──────┘       │     same as Spotlight
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Add all 3 to my order   →  │    │  ← bulk action (NEW)
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Two interaction modes, mutually compatible:**

1. **Per-tile stepper (default).** Same model as Spotlight: tap
   `+` → autosaves into the primary draft → expands to `[-N+]`. No
   commit step, no drawer. The customer can pick one or two items
   from the grid á la carte.
2. **Add all button (bulk).** Tap → bulk-saves *every* product in
   the grid at qty 1 (skipping any tile already at qty>0 — those
   keep their existing qty). Same behavior pattern as `<PromoSheet>`'s
   commit, but no drawer in between.

The "Add all" button label is dynamic:

| State | Copy |
|---|---|
| 0 tiles have qty>0 | `Add all 3 to my order  →` |
| Some tiles have qty>0 | `Add the rest (2 more)  →` |
| All tiles have qty>0 | (Hidden — nothing to add) |

**No-draft case (both modes):** the *first* per-tile `+` tap or the
"Add all" tap auto-creates a draft for tomorrow, mirroring how
[`<PromoSheet>`](#c32--promo-drawer-promosheet-new) and the existing
[`<PromoProductGrid>`'s `ensureDraftId`](../../../components/portal/promo-product-grid.tsx#L60-L103)
work. No date picker — the grid is a fast-add surface, and the
auto-create matches the customer's expectation of "I tapped a
specials tile, just add it."

**Callout pills (B9):** each tile can render a small pill in the
top-left corner with text the salesman entered in the
`badge_overrides` JSONB column on the announcement
(`{ "<product_id>": "-15%" }`). The schema column already exists
([`announcements` migration in W2](#w2--migration-announcements--customer_announcements-tables)).
What's new is the admin authoring UI for it (an inline `[ Badge: ___ ]`
input next to each chip in the multi-product picker — see B9 below)
and the render path in `SpecialsGridCard`.

Pill style: small, accent-bg or destructive-bg depending on text
sentiment (positive deals = accent, urgency = destructive — handled
by a simple keyword heuristic on the badge text, or salesman picks
a color in B9). Reuses
[`<ProductTile>`'s overlaySlot pattern](../../../components/catalog/product-tile.tsx).

**Why specials grid does NOT adopt the drawer model:**

The grid lives inline on the homepage as a glanceable specials shelf.
Per-tap autosave matches catalog muscle memory (steppers behave the
same on every product tile in the app). The drawer earns its
complexity only when the customer is being *routed into* a curated
list — they need an explicit commit step because they crossed a
surface boundary. Specials grid is *already on the homepage*; there's
no boundary to cross, so no commit step is needed.

The "Add all" button is the bulk equivalent of the drawer's commit —
giving customers who want to take everything a one-tap shortcut
without forcing the drawer's pre-select dance on them.

**Today vs target:**
- Per-tile stepper autosave: **mock** (local state only). Blocked on B3.
- Add all button: **doesn't exist.** New build (part of B3 or its own
  small item — call it B3+).
- Callout pills: **schema column exists, no UI.** Blocked on B9
  (admin-side authoring + customer-side render).

---

### C4 — Manage usuals

**Tap budget: 1 per item. Real today.**

**Surface:** [`/portal/[token]/catalog`](../../../app/(portal)/portal/[token]/catalog/page.tsx)
+ [`ManageUsualsList`](../../../components/portal/manage-usuals-list.tsx).

#### C4.1 — Catalog page with three filter tabs

```
┌─────────────────────────────────────┐
│  ←   Manage usuals                  │
├─────────────────────────────────────┤
│  [All] [My usuals] [Not in usuals]  │  ← tabs
│                                     │
│  🔍 Search products                  │
│                                     │
│  ┌────┐ Cherry Coke 12pk        ☆   │
│  └────┘ $14.99                      │
│                                     │
│  ┌────┐ Sprite 2L                ★  │  ← starred = usual
│  └────┘ $3.49                       │
│                                     │
│  …                                  │
└─────────────────────────────────────┘
```

**→ Tap star (1 tap)** → optimistic toggle → PATCH `/api/portal/usuals`
→ on error rollback. No screen change. Subsequent visits retain state.

No new surfaces. Existing.

---

### C5 — Reorder a past order

**Tap budget: best 1 (direct), acceptable 3 (preview first). Real today.**

**Surface:** [`/portal/[token]/orders`](../../../app/(portal)/portal/[token]/orders/page.tsx)
+ [`OrderHistoryList`](../../../components/portal/order-history-list.tsx).

#### C5.1 — Order history list

```
┌─────────────────────────────────────┐
│  ←   Order history                  │
├─────────────────────────────────────┤
│                                     │
│  ●  Tuesday, Apr 28                 │
│     14 items · $182.40              │
│              [ 👁 ] [ Reorder ]      │
│                                     │
│  ●  Tuesday, Apr 21                 │
│     12 items · $156.20              │
│              [ 👁 ] [ Reorder ]      │
│                                     │
│  …                                  │
└─────────────────────────────────────┘
```

**→ Tap Reorder (1 tap)** → POST `/api/portal/orders/[id]/clone` with
tomorrow's date → redirect to new draft → C1.2 takes over.

**→ Or tap 👁 (1 tap)** → C5.2.

#### C5.2 — Order preview sheet

**Surface:** [`OrderPreviewSheet`](../../../components/portal/order-preview-sheet.tsx).
Lazy-fetches items via GET `/api/portal/orders/[id]/items`.

```
┌─────────────────────────────────────┐
│  Tuesday, Apr 28               ✕    │
│  14 items · $182.40                 │
├─────────────────────────────────────┤
│                                     │
│  ┌────┐ Cherry Coke 12pk × 4        │
│  └────┘ $59.96                      │
│                                     │
│  ┌────┐ Sprite 2L × 6               │
│  └────┘ $20.94                      │
│                                     │
│  …                                  │
│                                     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │  Reorder these items     →  │    │  ← accent
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**→ Tap Reorder these items (1 tap)** → same clone API as C5.1 → C1.2.

No new surfaces. Existing.

---

### C6 — Adjust quantities mid-draft

**Tap budget: 1 per change. Real today.**

Customer is already in [`OrderBuilder`](../../../components/catalog/order-builder.tsx).
Each stepper tap mutates state → 300ms debounce → autosave via
[`useAutoSavePortal`](../../../lib/hooks/useAutoSavePortal.ts).

**One known soft spot:**
[`useAutoSavePortal.ts:122,151`](../../../lib/hooks/useAutoSavePortal.ts#L122)
silently swallows in-flight save failures with `.catch(() => undefined)`
if the component unmounts during the debounce window. Customer sees no
error in that race. Roadmap §6 marked this as a question, default
position: **add a small saved-status indicator near the cart bar that
turns red on swallow**, scoped as Phase 3 polish (not B-numbered).

No new surfaces — would need a small indicator next to the cart bar.

#### C6.1 — Optional saved-status indicator `[NEW, optional]`

```
                          ┌──────────┐
[ existing cart bar ] ←── │  Saved ✓ │   ← inline next to count
                          └──────────┘
```

When a save fails: changes to `Save failed — retry?` with a tap
target. Single inline element; no new modal. Skip for v1 unless the
silent-swallow becomes a customer-reported bug.

---

## Salesman flows (S1, S2)

### S1 — Onboard a new customer

**Tap budget: best 8, acceptable 12. Real today via CSV import; new "+ New"
form is the proposal.**

#### S1.1 — Customer directory

**Surface:** [`/admin/customers`](../../../app/(admin)/admin/customers/page.tsx).

```
┌─────────────────────────────────────────────────────────┐
│  Customers                                  [ + New ]   │
├─────────────────────────────────────────────────────────┤
│  🔍 Search · Filter ▾                  Import · Export  │
│                                                         │
│  Acme Deli           Maya Ortiz       (415) 555-0100    │
│  Best Bev            Jordan Park      (415) 555-0102    │
│  Corner Mart         Sam Lee          (415) 555-0118    │
│  …                                                      │
└─────────────────────────────────────────────────────────┘
```

**→ Tap "+ New" (1 tap)** → S1.2.

#### S1.2 — New customer form `[NEW]`

**This screen does not exist today.** Today the only path is CSV
import via [`/api/admin/customers/bulk`](../../../app/api/admin/customers/bulk/route.ts).
Single-add for one-off relationships needs its own form.

**Built as a `<Panel variant="centered">` modal (consistent with admin
add patterns) or `app/(admin)/admin/customers/new/page.tsx` if we
prefer a full page.** Recommended: **modal**, since the form is short.

```
┌────────────────────────────────────────────────┐
│  New customer                              ✕   │
├────────────────────────────────────────────────┤
│                                                │
│  Business name *                               │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Contact name              Phone               │
│  ┌─────────────────┐  ┌──────────────────┐     │
│  │                 │  │                  │     │
│  └─────────────────┘  └──────────────────┘     │
│                                                │
│  Email                                         │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Address              City     State   Zip     │
│  ┌─────────────────┐  ┌─────┐  ┌──┐  ┌────┐    │
│  │                 │  │     │  │  │  │    │    │
│  └─────────────────┘  └─────┘  └──┘  └────┘    │
│                                                │
│  Tags  (audience targeting)                    │
│  ┌──────────────────────────────────────────┐  │
│  │  [downtown ✕] [deli ✕] +                 │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Salesman: Dave Garcia (you)                   │  ← from W1
│                                                │
├────────────────────────────────────────────────┤
│       [ Cancel ]   [ Create & copy link  → ]   │  ← accent
└────────────────────────────────────────────────┘
```

Submit calls `/api/admin/customers/bulk` with one row, then PATCHes
[`/api/admin/customers/[id]`](../../../app/api/admin/customers/[id]/route.ts)
to set the additional fields. After W1, the create endpoint defaults
`created_by = currentSalesmanId` so the salesman line is automatic.

**→ Tap "Create & copy link" (1 tap)** → row inserted → token
generated → `/portal/{token}` URL copied to clipboard → toast
"Customer created. Link copied." → modal closes.

The salesman now texts the URL to the customer out-of-band.

**Total tap path: 2 (open form → submit) + 6 typed fields = 8 effective
taps.**

---

### S2 — Author an announcement

**Tap budget: best 8 (image+text + single product CTA), worst 14
(specials grid with 5 products + audience). Today: 0% persisted.**

#### S2.1 — Announcements list

**Surface:** [`/admin/announcements`](../../../app/(admin)/admin/announcements/page.tsx)
+ [`AnnouncementsManager`](../../../components/admin/announcements-manager.tsx).

```
┌─────────────────────────────────────────────────────────┐
│  Announcements                              [ + New ]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ↕ ●  May Promotion          [Image+text]   [✎] [✕]     │
│  ↕ ●  Summer Launch          [Image]        [✎] [✕]     │
│  ↕ ○  Cherry Coke spotlight  [Product]      [✎] [✕]     │
│  ↕ ●  Specials this week     [Specials]     [✎] [✕]     │
│  …                                                      │
└─────────────────────────────────────────────────────────┘
```

`●` = active toggle on, `○` = off. Drag handle on left.

**→ Tap "+ New" (1 tap)** → S2.2.

#### S2.2 — Type picker (existing, step 1 of dialog)

**Surface:** [`AnnouncementDialog`](../../../components/admin/announcement-dialog.tsx)
step 1.

```
┌────────────────────────────────────────────────┐
│  New announcement                          ✕   │
├────────────────────────────────────────────────┤
│  Choose a content type:                        │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Aā     │  │   ▓+Aā   │  │   ▓▓▓▓   │      │
│  │  Text    │  │ Image+   │  │  Image   │      │
│  │  card    │  │  text    │  │  banner  │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                │
│  ┌──────────┐  ┌──────────┐                    │
│  │ ★ img    │  │ ★ ⊞⊞⊞    │                    │
│  │ Product  │  │ Specials │                    │
│  │spotlight │  │  grid    │                    │
│  └──────────┘  └──────────┘                    │
│                                                │
└────────────────────────────────────────────────┘
```

**→ Tap a type tile (1 tap)** → S2.3.

#### S2.3 — Type-specific fields with live preview `[NEW LAYOUT]`

**The form fields exist today** (step 2 of [`AnnouncementDialog`](../../../components/admin/announcement-dialog.tsx)).
**The live-preview pane is NEW** (B4) — adds a second column on
desktop, stacks below on mobile.

Wireframe — desktop, Image+text type:

```
┌──────────────────────────────────────────────────────────────┐
│  ←  New announcement: Image+text                       ✕     │
├──────────────────────────────────────────────────────────────┤
│                                  │                            │
│  FORM                            │  PREVIEW                   │
│                                  │                            │
│  Image URL *                     │   ┌──────┐  Cherry Coke   │
│  [ https://… upload ▲ ]          │   │ [img]│  is back       │
│                                  │   │      │  After 6 mo.   │
│  Title *                         │   └──────┘  [ Try it ]    │
│  [ Cherry Coke is back  ]        │                            │
│                                  │                            │
│  Body                            │                            │
│  [ After 6 months. While    ]    │                            │
│  [ supplies last.           ]    │                            │
│                                  │                            │
│  CTA label                       │                            │
│  [ Try it                  ]     │                            │
│                                  │                            │
│  ┌─ When customers tap it… ──┐   │                            │
│  │ [Product list][●Single]    │   │                            │
│  │ [URL]                      │   │                            │
│  │                            │   │                            │
│  │ 🔍 cherry                  │   │                            │
│  │ ┌──────────────────────┐   │   │                            │
│  │ │ Cherry Coke 12pk  ✓  │   │   │                            │
│  │ │ Cherry Coke 2L       │   │   │                            │
│  │ └──────────────────────┘   │   │                            │
│  └────────────────────────────┘  │                            │
│                                  │                            │
│  ─────                           │                            │
│  Audience tags                   │                            │
│  [ downtown ✕ ] [ deli ✕ ] +     │                            │
│   ▲ 42 customers will see this   │  ← B6 reach indicator      │
│                                  │                            │
│  Go live          Expires        │                            │
│  [ 2026-05-01 ]   [ 2026-05-31 ] │                            │
│                                  │                            │
│  Active  ●                       │                            │
│                                  │                            │
├──────────────────────────────────────────────────────────────┤
│                          [ Cancel ]  [ Save & publish    ]   │
└──────────────────────────────────────────────────────────────┘
```

Mobile: same form but the preview pane collapses to a button at the
top: `[ 👁 Preview ]` that opens it as a `<Panel variant="bottom-sheet">`.

The **reach indicator** (`▲ 42 customers will see this`) is **B6**.
Lives directly under the audience-tag input. Empty tags →
"All N customers." Specific tags → "{N} customers (of M)."
Zero result rendered destructive: `▲ 0 customers — check your tags?`

The **Save button label changes based on state**:

- `is_active = true`, `starts_at` empty or in past → **Save & publish**
- `is_active = true`, `starts_at` in future → **Schedule**
- `is_active = false` → **Save as draft**

**→ Tap Save (1 tap)** → POST `/api/admin/announcements` (W3) →
optimistic insert → manager list closes dialog and shows the new row.

#### S2.4 — Reorder / toggle / delete (existing manager)

All inline on the list view (S2.1). Drag handle reorders, `●/○` toggles
active, `✕` opens a confirm dialog before delete.

**Today: all four mutations are local state only** (4× `// TODO` at
[`announcements-manager.tsx:76,85,91,136`](../../../components/admin/announcements-manager.tsx#L76)).
**Blocked on W3.**

#### S2.5 — Per-customer overrides `[NEW SECTION in existing screen]`

**Surface today:** [`/admin/customers/[id]/homepage`](../../../app/(admin)/admin/customers/[id]/homepage/page.tsx)
+ [`CustomerHomepageManager`](../../../components/admin/customer-homepage-manager.tsx).
The shape exists. The data is mock and the actions don't persist.

After W2 (the `customer_announcements` table) and a new
`/api/admin/customers/[id]/announcements/[announcement_id]` PATCH
endpoint:

```
┌─────────────────────────────────────────────────────────┐
│  ←  Acme Deli · Homepage                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ANNOUNCEMENTS SHOWING TO ACME DELI                     │
│                                                         │
│  Inherited from global (audience-tag match):            │
│  ┌───────────────────────────────────────────────────┐  │
│  │  May Promotion          [📌 Pin]  [🚫 Hide]       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Summer Launch          [📌 Pin]  [🚫 Hide]       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Pinned for Acme Deli only:                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  📌  Acme exclusive promo    [✎ Edit]  [✕ Delete] │  │
│  └───────────────────────────────────────────────────┘  │
│  [ + Add announcement just for Acme Deli ]              │
└─────────────────────────────────────────────────────────┘
```

**Tap "📌 Pin" (1 tap):** PATCH `customer_announcements` row with
`pin_sort_order = 0` → that announcement now appears at the top of
this customer's homepage only.

**Tap "🚫 Hide" (1 tap):** PATCH with `is_hidden = true` → the
announcement disappears from this customer's homepage even if they
otherwise match the audience.

**Tap "+ Add announcement just for Acme Deli" (1 tap):** opens the
same `<AnnouncementDialog>` as S2.2, but on save the announcement is
inserted with `audience_tags = []` *and* a `customer_announcements`
row with `pin_sort_order = 0` is created in the same transaction —
so it shows up only for this customer, pinned.

**This is the Account-rep flow** — listed in roadmap §1 as gap
material. With D1 resolved (dedicated `customer_announcements` table)
the flow is buildable; the wireframe above is what it looks like.

The "Deals" section that's currently shown above announcements in
[`customer-homepage-manager.tsx`](../../../components/admin/customer-homepage-manager.tsx#L42-L80)
is about pallet deals, **out of scope for this doc.**

---

## Wireframe inventory — every NEW surface in one place

Quick reference so during build no surface gets missed:

| ID | New surface | Lives in / replaces | Roadmap item |
|---|---|---|---|
| 1 | First-time hint inline in StartOrderDrawer | Conditional render in [`start-order-drawer.tsx`](../../../components/portal/start-order-drawer.tsx) | C2 polish |
| 2 | Spotlight no-draft date picker (`<Panel variant="bottom-sheet">`) | Replaces `window.alert` in [`announcement-card.tsx:218-224`](../../../components/portal/announcement-card.tsx#L218) | **B1** |
| 3 | Saved-status indicator next to cart bar (optional) | Adjacent to existing [`CartReviewSurface`](../../../components/catalog/cart-review-surface.tsx) | C6 polish |
| 4 | New customer form (`<Panel variant="centered">`) | New surface; opens from `[ + New ]` on [`/admin/customers`](../../../app/(admin)/admin/customers/page.tsx) | S1 build |
| 5 | Live preview pane in announcement dialog | New right-column inside [`announcement-dialog.tsx`](../../../components/admin/announcement-dialog.tsx) | **B4** |
| 6 | Reach indicator inside announcement dialog | New row under audience-tags input in same dialog | **B6** |
| 7 | Per-customer announcement manager | Replaces mock layout in [`customer-homepage-manager.tsx`](../../../components/admin/customer-homepage-manager.tsx) | S2.5, depends on W2 + D1 |
| 8 | Save-button label state machine | Logic change in [`announcement-dialog.tsx`](../../../components/admin/announcement-dialog.tsx) `handleSave` | S2 polish |
| 9 | **`<PromoSheet>` drawer** with pre-select + bulk-commit + stateful footer button | **Replaces the `/promo/[id]` route entirely.** New component built on the [`<CartReviewSurface>`](../../../components/catalog/cart-review-surface.tsx) chrome (same Panel shell, header pattern, sticky footer). Deletes [`app/(portal)/portal/[token]/promo/[id]/page.tsx`](../../../app/(portal)/portal/[token]/promo/[id]/page.tsx) and [`components/portal/promo-product-grid.tsx`](../../../components/portal/promo-product-grid.tsx). `<CtaLink>` in [`announcement-card.tsx`](../../../components/portal/announcement-card.tsx) becomes a `<button>` that opens the drawer. | **B8** |
| 10 | **"Add all" button on `SpecialsGridCard`** (with dynamic label: `Add all N` / `Add the rest (N more)` / hidden) | New action under the specials grid in [`announcement-card.tsx`](../../../components/portal/announcement-card.tsx#L290) `SpecialsGridCard`. | **B3+** (paired with B3) |
| 11 | **Callout pills** on specials-grid tiles (admin authoring + customer render) | Render: `<ProductTile>` overlay in [`SpecialsGridCard`](../../../components/portal/announcement-card.tsx#L290). Authoring: inline `[ Badge: ___ ]` input next to each chip in the multi-product picker inside [`announcement-dialog.tsx`](../../../components/admin/announcement-dialog.tsx). Reads/writes `badge_overrides` JSONB column from W2. | **B9** |

All eleven are scoped, none introduce new primitives — every one
reuses an existing `<Panel>` variant, `<Button>`, `<Input>`,
`<TagChipInput>`, `<ProductPopout>`, `<Stepper>`,
`<CartReviewSurface>`, or layout convention. No new design tokens,
no new material.

---

## What this doc deliberately does NOT cover

- **Pallet deal management** for the per-customer manager — separate
  from announcements.
- **Order detail / review for admin** (`/admin/orders/[id]`) — not
  part of the C/S flow set in the roadmap.
- **Catalog admin (product create/edit)** — a different scope; today
  the admin catalog is read-only and creating products would need its
  own design pass.
- **Salesman invite-completion screens** — already real and separate
  from the customer/announcement work.

If we add any of these to scope later, they get their own doc or an
appendix here.
