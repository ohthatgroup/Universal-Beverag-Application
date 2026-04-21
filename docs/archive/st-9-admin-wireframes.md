# ST-9 Admin Wireframes — First-Principles Redesign

Throwing away the current layout. Starting from: **what is the salesman physically doing, and what shape on screen matches that action?**

---

## 0. First principles

### Who

One user. A salesman. Standing up, phone in hand, often at a customer's counter. Sometimes behind the wheel between visits. Very rarely at a desk.

### What they actually do, ranked by time spent

| Rank | Action | Time share | Where |
|------|--------|------------|-------|
| 1 | Open a specific customer's order with them and add items | ~50% | In-store |
| 2 | Check which orders need action today | ~20% | Car, between visits |
| 3 | Change an order status (confirm delivered, cancel) | ~10% | Car |
| 4 | Create a new customer on the spot | ~8% | In-store, first visit |
| 5 | Check a customer's history / pricing before walking in | ~5% | Parked outside |
| 6 | Edit product/brand data | ~5% | Desk, rare |
| 7 | Run a report | ~2% | Desk, rare |

### What this means for shape

- **The phone is the primary canvas.** Treat desktop as scaled-up mobile.
- **Two thumbs, held upright.** The bottom half of the screen is where fingers live. Primary actions go low, not high.
- **Glance distance.** Information must be legible at arm's length, walking.
- **Interruption-tolerant.** The customer talks; the screen waits. No multi-step flows with state that can be lost.
- **One figure per screen.** Current admin is a grid of peers. Redesign picks a single primary object per screen and demotes the rest.

### Spatial rules (first principles, not copied from the old doc)

1. **Thumb zone first.** Primary action is in the bottom third of the screen when the user is tapping it repeatedly (add items, confirm). Top-right is only for one-shot creation actions that happen once per session.
2. **Height matters more than width.** Mobile screens scroll. Don't fear tall. Fear narrow columns and horizontal scroll.
3. **Vertical rhythm over boxes.** Cards, borders, and dividers are visual tax. Use whitespace and type weight.
4. **One page = one verb.** If the screen lets you do two unrelated things, it should be two screens.
5. **The customer's name is the object.** On any customer-adjacent screen, their name is the largest text. Orders and products are facets of the customer.

### Motion of the hand

Salesman flow, timed in beats:

```
1. Open app  →  2. Find customer  →  3. Open today's order  →
4. Add items while walking the shelves  →  5. Show customer total  →
6. Hand phone to customer for approval  →  7. Confirm
```

This is a **single rail**. The redesign mirrors that: customer-first index → customer home → order builder → review. No side trips through "Dashboard" or "Catalog" for the daily flow.

---

## 1. App shell

### Bottom tab bar — reduced to 3

Today: `Home · Customers · Staff · Catalog · Reports` (5 tabs). That's a desktop navbar on a phone.

Reset to 3 tabs that match the 3 activities:

```
┌─────────────────────────────────────────┐
│                                         │
│        (page content fills this)        │
│                                         │
├─────────────────────────────────────────┤
│   👥          📋           ⚙            │
│ Customers   Today        Admin          │
└─────────────────────────────────────────┘
```

- **Customers** — the A-flow entry. Salesman taps here first on arrival.
- **Today** — the B-flow entry. A queue of orders needing attention, collapsible by date.
- **Admin** — everything else (catalog, brands, reports, staff). Opens as a grouped drawer, not a peer tab.

The "Today" tab replaces the current Dashboard. No separate `/dashboard` and `/orders` — they were the same thing.

### Top bar — zero chrome

The only persistent top chrome is a 4pt safe-area strip. No logo, no breadcrumb, no user menu at the top. The user menu lives under `Admin`. This buys ~48px of vertical canvas for actual content.

---

## 2. Customers index — the true home

**Shape:** a dense search field that dominates the screen, with results appearing as the user types. No stats, no welcome, no "today's orders" panel competing for attention. The salesman came here to find one customer.

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │   ← generous vertical breath,
│                                         │     puts search in the thumb zone
│                                         │
│    ┌─────────────────────────────────┐  │
│    │ 🔍 Find a customer              │  │   ← large (h-14), centered
│    └─────────────────────────────────┘  │
│                                         │
│    Recently opened                      │   ← 3–5 chip list below search
│     · Portal E2E Customer               │
│     · Matrix Restaurant                 │
│     · Corner Bodega                     │
│                                         │
│                                         │
│                              (+)        │   ← FAB, new customer, thumb-right
├─────────────────────────────────────────┤
│   👥          📋           ⚙            │
│ Customers   Today        Admin          │
└─────────────────────────────────────────┘
```

**Typing state:**

```
┌─────────────────────────────────────────┐
│    ┌─────────────────────────────────┐  │
│    │ 🔍 port                    × │  │
│    └─────────────────────────────────┘  │
│                                         │
│    Portal E2E Customer                  │   ← instant results,
│    inbox+e2e@…  ·  Apr 20 draft         │     tap whole row
│    ─────────────────────────────        │
│    Portal Matrix Customer               │
│    inbox+matrix@…  ·  Apr 16 draft      │
│    ─────────────────────────────        │
│    Portal Persistent Customer           │
│    inbox+persist@…  ·  Apr 17 submitted │
│                                         │
└─────────────────────────────────────────┘
```

**Decisions.**
- Search field is large and lives in the middle of the screen (thumb zone).
- No alphabetical list — the salesman knows the customer's name.
- "Recently opened" solves the "I just left there, going back for one more thing" case.
- FAB for `+ New customer` because it's a one-shot action — it doesn't belong in the permanent header.

---

## 3. Customer home — `/admin/customers/[id]`

**Shape:** customer name is the biggest thing on the page. Everything else supports it. Two primary doors — **Start today's order** and **Share portal**. Nothing else competes.

```
┌─────────────────────────────────────────┐
│ ←                                    ⋮  │   ← overflow: Edit details, Delete,
│                                         │     Regenerate portal link
│                                         │
│    Portal E2E                           │   ← name is H1, ~36pt
│    Customer                             │
│                                         │
│    inbox+e2e@ohthatgrp.com              │
│    (555) 010-0100                       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │      + Start today's order          │ │   ← big primary, thumb-tall
│ │         Apr 18, 2026                │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │      ⎘ Share portal link            │ │   ← secondary
│ └─────────────────────────────────────┘ │
│                                         │
│    Recent orders                        │
│    ─────────────────────────────        │
│    Apr 20   Draft        $22.00   ›     │
│    Apr 15   Submitted    $87.50   ›     │
│    Apr 12   Delivered    $54.20   ›     │
│                                         │
│    [View all orders]                    │
│                                         │
│    Products                             │
│    Manage visibility and pricing  ›     │
│                                         │
└─────────────────────────────────────────┘
```

**Decisions.**
- `Start today's order` is the **single biggest element on the screen**. The salesman taps this when they walk in. If a draft already exists for today, the button reads `Continue draft`.
- `Share portal` is second-biggest because that's job 4: hand the phone over at some point in the visit.
- Contact info is plain text above the buttons (glanceable, not interactive). Phone/email are tap-to-call / tap-to-email but don't occupy visual weight.
- Recent orders collapse into a simple ledger row — date / status / total. No per-row chrome.
- "Products" is a single link to the products sub-page. It's rare.
- Editing contact info is in the `⋮` overflow. Rare.

**The 50/50 split we had on desktop is gone.** On desktop, the same column just gets `max-w-lg` centered. One rail.

---

## 4. Order builder — `/admin/orders/[id]`

This is the most-used screen. Spend the most space on it.

**Shape:** the order is the canvas. Adding items is the primary verb. The screen is divided into two zones by function:

- **Top 15% — context.** Customer name, date, running total.
- **Middle 65% — action zone.** Product list / search / usuals / pallet rail.
- **Bottom 20% — commit.** Review + submit / present-to-customer handoff.

```
┌─────────────────────────────────────────┐
│ ←  Portal E2E Customer            👁    │   ← Present toggle top-right
│    Apr 20, 2026                         │
├─────────────────────────────────────────┤
│ 🔍  Search products                     │   ← sticky under header
│                                         │
│ YOUR USUALS                             │   ← one-tap add; empty when none
│ ┌─────────────────────────────────────┐ │
│ │ COKE CLASSIC                        │ │
│ │ Coca-Cola · 24/12 OZ · $22.00       │ │
│ │                           [- 2 +]   │ │
│ └─────────────────────────────────────┘ │
│ ...                                     │
│                                         │
│ 💰 3 pallet deals — save up to $240 ›  │   ← thin sticky callout
│                                         │
│ BROWSE                                  │
│ ┌─────────────────────────────────────┐ │
│ │ CHERRY COKE                         │ │
│ │ Coca-Cola · 24/20 OZ · $28.50       │ │
│ │                            [+ Add]  │ │
│ └─────────────────────────────────────┘ │
│ ...                                     │
│                                         │
├─────────────────────────────────────────┤
│ 3 items · $67.40       [ Review → ]     │   ← sticky commit bar
└─────────────────────────────────────────┘
```

**Decisions.**
- No separate "cart" — every row is an inline stepper.
- `Review →` is the only commit action. Submit lives inside the Review sheet.
- Present mode strips admin chrome (override, remove buttons) and mirrors the customer view exactly. Toggle is top-right because it's once-per-session.
- Status, Cancel, Delete are behind `⋮` in the header (rare actions, not primary).
- Customer info (email, phone) is NOT on this screen — it's one back tap away on the customer home. Removing it reclaims ~40px of top real estate.
- Pallet callout is a single horizontal line, tappable → expands to a rail. Don't steal more than one line from the product list.

### Review sheet (slide-up)

```
┌─────────────────────────────────────────┐
│ ═══════════════════════════════════════ │   ← drag handle
│ Review order · Apr 20, 2026       [↓]   │
├─────────────────────────────────────────┤
│ COKE CLASSIC                            │
│ $22.00 × 2              $44.00   [- +]  │
│ ─────────────────────────────────────   │
│ CHERRY COKE                             │
│ $28.50 × 1              $28.50   [- +]  │
│                                         │
│                                         │
│ Subtotal                       $72.50   │
│ ┌─────────────────────────────────────┐ │
│ │         Submit order                │ │   ← thumb zone, w-full
│ └─────────────────────────────────────┘ │
│  Clear all                              │
└─────────────────────────────────────────┘
```

---

## 5. Today — the work queue

**Shape:** vertical list, grouped by date, newest first. Read like a timeline. One row per order. The salesman scrolls, finds what they need to act on, taps it.

```
┌─────────────────────────────────────────┐
│ Today                                   │
│ 2 need review · 9 drafts                │   ← single subtitle line
├─────────────────────────────────────────┤
│ [Needs review] [Drafts] [All]           │   ← 3 segmented filters, no more
│                                         │
│ TODAY · APR 18                          │
│                                         │
│ Portal E2E Customer                     │
│ 3 items · $67.40        Submitted  ›    │
│ ─────────────────────────────────────   │
│                                         │
│ APR 20                                  │
│                                         │
│ Matrix Restaurant                       │
│ 1 item · $22.00         Draft      ›    │
│ ─────────────────────────────────────   │
│ Corner Bodega                           │
│ 0 items · $0.00         Draft      ›    │
│ ─────────────────────────────────────   │
│                                         │
└─────────────────────────────────────────┘
```

**Decisions.**
- No "stat cards" at all. The 2-line subtitle gives the only counts worth glancing at.
- Rows are plain — no per-row buttons. Tap row → order detail (which has the actions).
- Bulk selection doesn't exist on mobile. It lives only on the desktop variant of this same page, revealed by a Select menu in the overflow.
- Search is intentionally absent. If you know the customer, go through **Customers** tab. If you're triaging today's work, you don't need search.

---

## 6. Admin drawer — `/admin`

Behind the third tab. A simple grouped list — not a dashboard.

```
┌─────────────────────────────────────────┐
│ Admin                                   │
├─────────────────────────────────────────┤
│ CATALOG                                 │
│   Products                535  ›        │
│   Brands                   43  ›        │
│   Pallet deals              4  ›        │
│                                         │
│ TEAM                                    │
│   Staff                     3  ›        │
│                                         │
│ INSIGHTS                                │
│   Reports                     ›         │
│                                         │
│ ACCOUNT                                 │
│   inbox@ohthatgrp.com                   │
│   Sign out                    ›         │
└─────────────────────────────────────────┘
```

Flat. No nested cards. Row → sub-page.

---

## 7. Catalog — `/admin/catalog`

Desk job. Desktop-first is fine. But the mobile shape still matters when checking a product in the field.

```
┌─────────────────────────────────────────┐
│ ← Admin                                 │
│ Products                            (+) │   ← FAB for create
│ 535 items                               │
├─────────────────────────────────────────┤
│ 🔍 Search                               │
│ [All] [New] [Discontinued]              │
├─────────────────────────────────────────┤
│ COCA-COLA                               │
│ ┌─────────────────────────────────────┐ │
│ │ [img]  COKE CLASSIC                 │ │
│ │        24/12 OZ · $22.00            │ │
│ │                                  ›  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ [img]  CHERRY COKE                  │ │
│ │        24/20 OZ · $28.50 · New      │ │
│ │                                  ›  │ │
│ └─────────────────────────────────────┘ │
│ PEPSI                                   │
│ ...                                     │
└─────────────────────────────────────────┘
```

**Decisions.**
- Grouped by brand — scannable, matches how the salesman thinks.
- `[img]` thumbnails finally earn their weight here (desk review of product line).
- FAB for create — consistent with customers index.
- Sort/drag happens on desktop only. Not worth the mobile complexity.

---

## 8. Product detail — `/admin/catalog/[id]`

One column, three grouped panels, autosave. Each panel has its own `Saved ✓` line.

```
┌─────────────────────────────────────────┐
│ ← Products                           ⋮  │
│ [ image  ]                              │   ← hero image, square
│                                         │
│ IDENTITY                          Saved │
│   Brand       Coca-Cola ▾               │
│   Title       COKE CLASSIC              │
│                                         │
│ PACK                              Saved │
│   Pack        24/12 OZ                  │
│   Count       24                        │
│   Size        12 oz                     │
│                                         │
│ COMMERCIAL                        Saved │
│   Price       $22.00                    │
│   Tags        classic, soda             │
│   ☐ New    ● Discontinued               │
│                                         │
└─────────────────────────────────────────┘
```

**Decisions.**
- Image is a proper hero — full-width square at the top. Current page buries it in the form grid.
- Inline labels (label-left, value-right) read like a spec sheet. Much faster to scan than a grid of inputs with floating labels.
- Autosave per-panel; the `Saved` indicator is at the panel heading, not next to each field.

---

## 9. Pallets list — `/admin/catalog/pallets`

```
┌─────────────────────────────────────────┐
│ ← Admin                                 │
│ Pallet deals                        (+) │
│ 4 active · 1 inactive                   │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [img]                               │ │
│ │ Build Your Own Pallet               │ │
│ │ Mixed · Save up to $240  · 12 items │ │
│ │                                  ›  │ │
│ └─────────────────────────────────────┘ │
│ ...                                     │
└─────────────────────────────────────────┘
```

---

## 10. Pallet detail — `/admin/catalog/pallets/[id]`

Contents are the primary object. Settings collapse.

```
┌─────────────────────────────────────────┐
│ ← Pallet deals                       ⋮  │
│ Build Your Own Pallet                   │
│ Mixed · Active · Save up to $240        │
├─────────────────────────────────────────┤
│ Contents (12)                       (+) │
│                                         │
│ COKE CLASSIC             ×4        🗑   │
│ CHERRY COKE              ×2        🗑   │
│ PEPSI                    ×4        🗑   │
│ ...                                     │
│                                         │
│ ▸ Settings                              │
│   (title, image, price, type, active)   │
└─────────────────────────────────────────┘
```

No inner scroll. No two-column. The page scrolls naturally.

---

## 11. Brands — `/admin/brands`

```
┌─────────────────────────────────────────┐
│ ← Admin                                 │
│ Brands                              (+) │
│ 43 brands                               │
├─────────────────────────────────────────┤
│ 🔍 Search brands                        │
├─────────────────────────────────────────┤
│ [logo] Coca-Cola                 Saved  │
│ [logo] Pepsi                     Saved  │
│ [logo] Corona                    Saved  │
│                                         │
└─────────────────────────────────────────┘
```

Tap logo → swap image. Tap name → inline edit. Autosave. No row chrome, no per-row Save button.

---

## 12. Customer products — `/admin/customers/[id]/products`

```
┌─────────────────────────────────────────┐
│ ← Portal E2E Customer                   │
│ Products                                │
│ 535 available                           │
├─────────────────────────────────────────┤
│ 🔍 Search                               │
│ [All] [Hidden] [Pinned] [Custom prices] │
├─────────────────────────────────────────┤
│ COCA-COLA                               │
│   COKE CLASSIC           $22.00   ⭐ 👁 │   ← star=pin, eye=hide, both inline
│   Override               [22.00 ]       │
│                                  Saved  │
│   ─────────────────                     │
│   CHERRY COKE            $28.50   ☆ 👁 │
│ PEPSI                                   │
│ ...                                     │
└─────────────────────────────────────────┘
```

Per-row autosave. No sticky footer. No pending-changes pill.

---

## 13. Reports — `/admin/reports`

```
┌─────────────────────────────────────────┐
│ ← Admin                                 │
│ Reports                                 │
│ Last 7 days · Apr 11 – Apr 18           │
├─────────────────────────────────────────┤
│ [7d] [30d] [Month] [Custom]             │
│                                         │
│ 47 orders · $12,480 revenue             │
│ 8 drafts · 39 submitted                 │
├─────────────────────────────────────────┤
│ TOP PRODUCTS                            │
│   1. COKE CLASSIC    128 cases  $2.8k   │
│   2. CHERRY COKE      72 cases  $2.1k   │
│   3. PEPSI            64 cases  $1.4k   │
│                                         │
│ TOP CUSTOMERS                           │
│   1. Matrix Restaurant         $3,240   │
│   2. Corner Bodega             $2,120   │
│                                         │
│ RECENT ORDERS                           │
│   (read-only, tap to open)              │
└─────────────────────────────────────────┘
```

No Run button. Presets apply instantly. Rows are dense — one per line, right-aligned money.

---

## 14. Staff — `/admin/staff`

```
┌─────────────────────────────────────────┐
│ ← Admin                                 │
│ Staff                               (+) │
│ 3 active · 1 pending                    │
├─────────────────────────────────────────┤
│ Admin User                              │
│ inbox@ohthatgrp.com · Active       ⋮    │
│ ─────────────────                       │
│ Pending Invite                          │
│ new@sales.com · Sent 2d ago        ⋮    │
│                                         │
└─────────────────────────────────────────┘
```

Plain ledger. Overflow per row for Disable / Resend / Copy invite / Revoke.

---

## Summary of what changed from round-1 wireframes

| Round 1 (copied layout) | Round 2 (first principles) |
|---|---|
| 5 bottom tabs | 3 tabs (Customers, Today, Admin) |
| Dashboard is the landing | Customers is the landing |
| Stats strip on dashboard | No stats on any work screen |
| Every list screen has a top-right `+ New` | FAB for create on list screens; overflow for destructive |
| Order detail has a 3-button action bar | Order detail header is customer name + Present toggle only |
| Customer detail has form left / orders right (or stacked) | Single rail: name → Start order button → orders ledger → details overflow |
| Grouped cards and borders everywhere | Whitespace and type weight; cards only where they map to a tangible object (product, pallet) |
| Reports has a Run button | Presets apply instantly |
| Catalog mixes list + inline create | FAB opens a sheet, list stays clean |
| Product detail is a flat form | Hero image + three spec-sheet panels with per-panel autosave |

---

## Next step

Lock this. Then the implementation pass walks each screen, brings the real UI into conformance, and drops the old layouts. Pre-existing portal compile errors are out of scope for this doc but must be fixed to make the portal half of the app buildable.
