# Universal Beverages — ASCII Wireframes
## Mobile-First · Monochrome · Clean/Minimal

---

# ═══════════════════════════════════════
# CUSTOMER FLOW
# ═══════════════════════════════════════


## Screen 1: Home (Landing)
## ─────────────────────────

```
┌─────────────────────────────┐
│  ◉ Universal Beverages      │
│                              │
│                              │
│                              │
│    ┌───────────────────┐     │
│    │  📅 Select Date   │     │
│    │                   │     │
│    │  ◄  Feb 20, 2025 ►│     │
│    │                   │     │
│    │ ┌───────────────┐ │     │
│    │ │  + New Order   │ │     │
│    │ └───────────────┘ │     │
│    │                   │     │
│    │ ┌───────────────┐ │     │
│    │ │ Continue Order │ │     │
│    │ │  (3 items)     │ │     │
│    │ └───────────────┘ │     │
│    │                   │     │
│    └───────────────────┘     │
│                              │
│                              │
│                              │
├──────────────────────────────┤
│  🏠 Home    📋 Orders        │
└──────────────────────────────┘
```

**Notes:**
- Modal overlay on open/landing
- "Continue Order" only appears if a draft exists for that date
- Simple date picker with left/right arrows
- Bottom nav: Home, Orders (2 tabs only)


---


## Screen 2: Order Page (Catalog View)
## ────────────────────────────────────

```
┌──────────────────────────────┐
│  ← Back         Feb 20, 2025│
├──────────────────────────────┤
│ ┌──────┐ ┌────────┐ ┌─────┐ │
│ │ New  │ │Pallets │ │ All │ │
│ │Items │ │        │ │     │ │
│ └──────┘ └────────┘ └─────┘ │
├──────────────────────────────┤
│  🔍 Search products...       │
│                              │
│  Filter: [Brand ▾] [Size ▾] │
│  Group:  [Brand ▾]          │
├──────────────────────────────┤
│                              │
│  ── Coke Products ────────── │
│                              │
│  ┌──────────────────────┐    │
│  │ CHERRY COKE           │    │
│  │ 24/20 OZ.    $28.50   │    │
│  │           [ - ] 0 [+] │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ COKE CLASSIC          │    │
│  │ 24/12 OZ.    $22.00   │    │
│  │           [ - ] 0 [+] │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ DIET COKE             │    │
│  │ 24/20 OZ.    $28.50   │    │
│  │           [ - ] 0 [+] │    │
│  └──────────────────────┘    │
│                              │
│  ── Pepsi Products ───────── │
│                              │
│  ┌──────────────────────┐    │
│  │ PEPSI                  │    │
│  │ 24/12 OZ.    $21.50   │    │
│  │           [ - ] 2 [+] │    │
│  └──────────────────────┘    │
│                              │
│  ...                         │
│                              │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │  Review Order (3 items)  │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│  🏠 Home    📋 Orders        │
└──────────────────────────────┘
```

**Notes:**
- Tabs: New Items | Pallets | All (full catalog)
- "All" tab = compact rows (no images), just title + details + price + qty
- "New Items" tab = cards with images (see Screen 2b)
- Group headers are collapsible
- Sticky bottom bar with "Review Order" appears when items > 0
- Price shown/hidden per customer setting
- Quantity changes auto-save (no add-to-cart button)
- Search filters across current tab


---


## Screen 2a: "New Items" Tab (Card View)
## ───────────────────────────────────────

```
┌──────────────────────────────┐
│  ← Back         Feb 20, 2025│
├──────────────────────────────┤
│ ┌──────┐ ┌────────┐ ┌─────┐ │
│ │▐New ▐│ │Pallets │ │ All │ │
│ │▐Items▐│ │        │ │     │ │
│ └──────┘ └────────┘ └─────┘ │
├──────────────────────────────┤
│                              │
│  ┌──────────────────────┐    │
│  │ ┌──────────────────┐ │    │
│  │ │                  │ │    │
│  │ │   [product img]  │ │    │
│  │ │                  │ │    │
│  │ └──────────────────┘ │    │
│  │  CHERRY COKE          │    │
│  │  24/20 OZ.            │    │
│  │  $28.50               │    │
│  │           [ - ] 0 [+] │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ ┌──────────────────┐ │    │
│  │ │                  │ │    │
│  │ │   [product img]  │ │    │
│  │ │                  │ │    │
│  │ └──────────────────┘ │    │
│  │  NEW MOUNTAIN DEW     │    │
│  │  12/16.9 OZ.          │    │
│  │  $18.00               │    │
│  │           [ - ] 0 [+] │    │
│  └──────────────────────┘    │
│                              │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │  Review Order (3 items)  │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│  🏠 Home    📋 Orders        │
└──────────────────────────────┘
```

**Notes:**
- Card layout with product image
- No filter/group controls on this tab (curated list)
- Same quantity selector behavior


---


## Screen 2b: "Pallets" Tab
## ─────────────────────────

```
┌──────────────────────────────┐
│  ← Back         Feb 20, 2025│
├──────────────────────────────┤
│ ┌──────┐ ┌────────┐ ┌─────┐ │
│ │ New  │ │▐Pallet▐│ │ All │ │
│ │Items │ │▐  s   ▐│ │     │ │
│ └──────┘ └────────┘ └─────┘ │
├──────────────────────────────┤
│                              │
│  ── Single Pallets ───────── │
│                              │
│  ┌──────────────────────┐    │
│  │ ┌──────────────────┐ │    │
│  │ │   [pallet img]   │ │    │
│  │ └──────────────────┘ │    │
│  │  COKE CLASSIC PALLET  │    │
│  │  80 cases / 24-12oz   │    │
│  │  $19.50/case (save $3) │    │
│  │           [ - ] 0 [+] │    │
│  └──────────────────────┘    │
│                              │
│  ── Mixed Pallets ────────── │
│                              │
│  ┌──────────────────────┐    │
│  │ ┌──────────────────┐ │    │
│  │ │   [pallet img]   │ │    │
│  │ └──────────────────┘ │    │
│  │  SUMMER MIX PALLET    │    │
│  │  40x Coke, 20x Sprite │    │
│  │  20x Fanta             │    │
│  │  $1,560 (save $120)   │    │
│  │           [ - ] 0 [+] │    │
│  └──────────────────────┘    │
│                              │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │  Review Order (3 items)  │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│  🏠 Home    📋 Orders        │
└──────────────────────────────┘
```

**Notes:**
- Two subsections: Single Pallets, Mixed Pallets
- Card layout with images (like New Items)
- Shows savings/discount clearly
- Mixed pallet shows breakdown of contents


---


## Screen 3: Review Drawer (Slide-Up)
## ───────────────────────────────────

```
┌──────────────────────────────┐
│                              │
│  ░░░░░░ dimmed catalog ░░░░ │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░ │
├──────────────────────────────┤
│  ─── drag handle ───         │
│                              │
│  Review Order    [Reset All] │
│  Feb 20, 2025                │
│  ────────────────────────── │
│                              │
│  CHERRY COKE                 │
│  24/20 OZ.                   │
│  $28.50 × 2        $57.00   │
│                  [ - ] 2 [+] │
│  ────────────────────────── │
│  PEPSI                       │
│  24/12 OZ.                   │
│  $21.50 × 1        $21.50   │
│                  [ - ] 1 [+] │
│  ────────────────────────── │
│  SUMMER MIX PALLET           │
│  $1,560 × 1      $1,560.00  │
│                  [ - ] 1 [+] │
│  ────────────────────────── │
│                              │
│  3 items          $1,638.50  │
│                              │
│ ┌──────────────────────────┐ │
│ │     Submit Order ✓       │ │
│ └──────────────────────────┘ │
│                              │
└──────────────────────────────┘
```

**Notes:**
- Slides up from bottom over catalog
- Drag handle to expand/collapse
- Quantity adjustable inline (same auto-save)
- "Reset All" clears entire order
- Total shown at bottom
- Submit button prominent
- Price column hidden if customer has prices disabled


---


## Screen 3a: No-Price Review Drawer
## ──────────────────────────────────

```
├──────────────────────────────┤
│  ─── drag handle ───         │
│                              │
│  Review Order    [Reset All] │
│  Feb 20, 2025                │
│  ────────────────────────── │
│                              │
│  CHERRY COKE                 │
│  24/20 OZ.                   │
│                  [ - ] 2 [+] │
│  ────────────────────────── │
│  PEPSI                       │
│  24/12 OZ.                   │
│                  [ - ] 1 [+] │
│  ────────────────────────── │
│                              │
│  3 items                     │
│                              │
│ ┌──────────────────────────┐ │
│ │     Submit Order ✓       │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

**Notes:**
- Same layout, just no prices or totals
- Item count only


---


## Screen 4: Orders Page
## ─────────────────────

```
┌──────────────────────────────┐
│  ◉ Universal Beverages       │
├──────────────────────────────┤
│                              │
│  CURRENT ORDER               │
│  ┌──────────────────────┐    │
│  │ Feb 20, 2025          │    │
│  │ 3 items · $1,638.50   │    │
│  │ Status: ● Submitted    │    │
│  │                        │    │
│  │ [Edit] [CSV] [Cancel]  │    │
│  └──────────────────────┘    │
│                              │
│  ────────────────────────── │
│                              │
│  PREVIOUS ORDERS             │
│                              │
│  ┌──────────────────────┐    │
│  │ Feb 13, 2025          │    │
│  │ 5 items · $420.00     │    │
│  │ Status: ✓ Delivered    │    │
│  │                        │    │
│  │ [Reorder]    [Delete]  │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Feb 06, 2025          │    │
│  │ 8 items · $812.50     │    │
│  │ Status: ✓ Delivered    │    │
│  │                        │    │
│  │ [Reorder]    [Delete]  │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Jan 30, 2025          │    │
│  │ 2 items · $155.00     │    │
│  │ Status: ✓ Delivered    │    │
│  │                        │    │
│  │ [Reorder]    [Delete]  │    │
│  └──────────────────────┘    │
│                              │
├──────────────────────────────┤
│  🏠 Home    📋 Orders        │
└──────────────────────────────┘
```

**Notes:**
- Current order at top (if exists) with inline actions
- Edit → opens order page for that date
- Reorder → prompts date picker, clones items to new draft
- Delete → confirmation dialog
- CSV download available on all orders
- Status badges: Draft (○), Submitted (●), Delivered (✓)


---


## Screen 4a: Reorder → Date Picker Modal
## ───────────────────────────────────────

```
┌──────────────────────────────┐
│                              │
│  ░░░░░░ dimmed orders ░░░░░ │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                              │
│    ┌───────────────────┐     │
│    │  Reorder for...   │     │
│    │                   │     │
│    │  ◄  Feb 22, 2025 ►│     │
│    │                   │     │
│    │ ┌───────────────┐ │     │
│    │ │  Clone Order   │ │     │
│    │ └───────────────┘ │     │
│    │                   │     │
│    │     [Cancel]      │     │
│    └───────────────────┘     │
│                              │
│                              │
└──────────────────────────────┘
```


---


# ═══════════════════════════════════════
# SALESMAN DASHBOARD
# ═══════════════════════════════════════


## Screen 5: Dashboard Home
## ────────────────────────

```
┌──────────────────────────────┐
│  ◉ UB Admin                  │
├──────────────────────────────┤
│                              │
│  Today · Feb 17, 2025        │
│                              │
│  ┌────────┐  ┌────────┐     │
│  │  12    │  │   3    │     │
│  │ Orders │  │  New   │     │
│  │ Today  │  │ Orders │     │
│  └────────┘  └────────┘     │
│                              │
│  ┌────────┐  ┌────────┐     │
│  │  47    │  │   5    │     │
│  │ Active │  │Pending │     │
│  │ Cust.  │  │Delivery│     │
│  └────────┘  └────────┘     │
│                              │
│  ────────────────────────── │
│                              │
│  RECENT ORDERS               │
│                              │
│  ┌──────────────────────┐    │
│  │ Joe's Deli            │    │
│  │ Feb 20 · 5 items      │    │
│  │ ● Submitted           │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Corner Market         │    │
│  │ Feb 20 · 12 items     │    │
│  │ ● Submitted           │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Main St Cafe          │    │
│  │ Feb 19 · 3 items      │    │
│  │ ○ Draft                │    │
│  └──────────────────────┘    │
│                              │
│  [View All Orders →]         │
│                              │
├──────────────────────────────┤
│ 🏠 Home  📦 Orders  👤 Cust │
│           📊 Reports 🧃 Cat │
└──────────────────────────────┘
```

**Notes:**
- Quick stats at top (tap-to-navigate)
- Recent orders sorted by newest
- Bottom nav: Home, Orders, Customers, Reports, Catalog
- 5-tab nav for salesman (more tools)


---


## Screen 6: Orders List
## ─────────────────────

```
┌──────────────────────────────┐
│  Orders           [+ New ▾]  │
├──────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌───────┐ │
│ │ All  │ │Submit│ │Drafts │ │
│ └──────┘ └──────┘ └───────┘ │
│                              │
│  🔍 Search by customer...    │
├──────────────────────────────┤
│                              │
│  ── Feb 20 ──────────────── │
│                              │
│  ┌──────────────────────┐    │
│  │ Joe's Deli        →   │    │
│  │ 5 items · $420.00     │    │
│  │ ● Submitted           │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Corner Market     →   │    │
│  │ 12 items · $1,230.00  │    │
│  │ ● Submitted           │    │
│  └──────────────────────┘    │
│                              │
│  ── Feb 19 ──────────────── │
│                              │
│  ┌──────────────────────┐    │
│  │ Main St Cafe      →   │    │
│  │ 3 items · $155.00     │    │
│  │ ○ Draft                │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Quick Stop        →   │    │
│  │ 8 items · $612.00     │    │
│  │ ✓ Delivered            │    │
│  └──────────────────────┘    │
│                              │
├──────────────────────────────┤
│ 🏠 Home  📦 Orders  👤 Cust │
│           📊 Reports 🧃 Cat │
└──────────────────────────────┘
```

**Notes:**
- Filter tabs: All, Submitted, Drafts (+ Delivered)
- Grouped by delivery date
- Tap row → Order Detail
- "+ New" → pick customer, then pick date


---


## Screen 7: Order Detail (Salesman)
## ──────────────────────────────────

```
┌──────────────────────────────┐
│  ← Orders                    │
├──────────────────────────────┤
│                              │
│  Joe's Deli                  │
│  Feb 20, 2025                │
│  Status: ● Submitted         │
│                              │
│  [Mark Delivered] [CSV ↓]    │
│                              │
│  ────────────────────────── │
│                              │
│  CHERRY COKE                 │
│  24/20 OZ.                   │
│  $28.50 × 2         $57.00  │
│                  [ - ] 2 [+] │
│  ────────────────────────── │
│  PEPSI                       │
│  24/12 OZ.                   │
│  $21.50 × 3         $64.50  │
│                  [ - ] 3 [+] │
│  ────────────────────────── │
│  COKE CLASSIC                │
│  24/12 OZ.                   │
│  $22.00 × 5        $110.00  │
│                  [ - ] 5 [+] │
│  ────────────────────────── │
│                              │
│  5 items             $231.50 │
│                              │
│  ────────────────────────── │
│                              │
│  [+ Add Items]               │
│                              │
│  [Cancel Order]  [Delete]    │
│                              │
├──────────────────────────────┤
│ 🏠 Home  📦 Orders  👤 Cust │
│           📊 Reports 🧃 Cat │
└──────────────────────────────┘
```

**Notes:**
- Salesman can edit quantities inline
- "Add Items" → opens catalog picker
- Status transitions: Draft → Submitted → Delivered
- "Mark Delivered" changes status
- Cancel reverts to Draft, Delete removes entirely


---


## Screen 8: Customers List
## ────────────────────────

```
┌──────────────────────────────┐
│  Customers         [+ New]   │
├──────────────────────────────┤
│  🔍 Search customers...      │
├──────────────────────────────┤
│                              │
│  ┌──────────────────────┐    │
│  │ Joe's Deli        →   │    │
│  │ 📞 (555) 123-4567     │    │
│  │ Last order: Feb 20    │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Corner Market     →   │    │
│  │ 📞 (555) 234-5678     │    │
│  │ Last order: Feb 20    │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Main St Cafe      →   │    │
│  │ 📞 (555) 345-6789     │    │
│  │ Last order: Feb 19    │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Quick Stop        →   │    │
│  │ 📞 (555) 456-7890     │    │
│  │ Last order: Feb 15    │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Harbor Grill       →   │    │
│  │ 📞 (555) 567-8901     │    │
│  │ Last order: Jan 30    │    │
│  └──────────────────────┘    │
│                              │
├──────────────────────────────┤
│ 🏠 Home  📦 Orders  👤 Cust │
│           📊 Reports 🧃 Cat │
└──────────────────────────────┘
```


---


## Screen 9: Customer Detail
## ─────────────────────────

```
┌──────────────────────────────┐
│  ← Customers                 │
├──────────────────────────────┤
│                              │
│  Joe's Deli                  │
│  📞 (555) 123-4567  [Call]   │
│  ✉  joe@deli.com   [Email]  │
│  📍 123 Main St, Anytown     │
│                              │
│  [Edit Info]                 │
│                              │
│  ────────────────────────── │
│  CATALOG SETTINGS            │
│  ────────────────────────── │
│                              │
│  Show Prices       [●━━━ ON] │
│  Default Grouping  [Brand ▾] │
│  Custom Pricing    [━━━○ OFF]│
│                              │
│  [Manage Products →]         │
│  (12 excluded)               │
│                              │
│  ────────────────────────── │
│  ORDERS                      │
│  ────────────────────────── │
│                              │
│  [+ New Order for Customer]  │
│                              │
│  ┌──────────────────────┐    │
│  │ Feb 20 · 5 items  →   │    │
│  │ $420.00 · ● Submitted  │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Feb 13 · 8 items  →   │    │
│  │ $612.00 · ✓ Delivered  │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ Feb 06 · 3 items  →   │    │
│  │ $155.00 · ✓ Delivered  │    │
│  └──────────────────────┘    │
│                              │
│  ────────────────────────── │
│                              │
│  [Delete Customer]           │
│                              │
├──────────────────────────────┤
│ 🏠 Home  📦 Orders  👤 Cust │
│           📊 Reports 🧃 Cat │
└──────────────────────────────┘
```

**Notes:**
- Quick-action contact buttons (Call, Email)
- Catalog settings with toggles
- "Manage Products" → include/exclude + custom pricing
- Order history inline
- "New Order for Customer" → date picker → catalog


---


## Screen 10: Customer Product Manager
## ────────────────────────────────────

```
┌──────────────────────────────┐
│  ← Joe's Deli · Products     │
├──────────────────────────────┤
│  🔍 Search products...       │
│  Filter: [Brand ▾]          │
├──────────────────────────────┤
│                              │
│  ── Coke Products ────────── │
│                              │
│  ┌──────────────────────┐    │
│  │ [✓] CHERRY COKE       │    │
│  │     24/20 OZ.         │    │
│  │     Default: $28.50   │    │
│  │     Custom:  [______] │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ [✓] COKE CLASSIC      │    │
│  │     24/12 OZ.         │    │
│  │     Default: $22.00   │    │
│  │     Custom:  [$20.00] │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ [ ] COKE ZERO         │    │
│  │     24/20 OZ.         │    │
│  │     (excluded)        │    │
│  └──────────────────────┘    │
│                              │
│  ── Pepsi Products ───────── │
│                              │
│  ...                         │
│                              │
├──────────────────────────────┤
│ 🏠 Home  📦 Orders  👤 Cust │
│           📊 Reports 🧃 Cat │
└──────────────────────────────┘
```

**Notes:**
- Checkboxes to include/exclude products
- Custom price field (only if Custom Pricing toggle is ON)
- Shows default price for reference
- Grouped by brand


---


# ═══════════════════════════════════════
# FLOW SUMMARY
# ═══════════════════════════════════════

```
CUSTOMER FLOW:
─────────────
Login (magic link)
  → Home → Date Modal (pick date)
    → New Order / Continue Order
      → Catalog (tabs: New Items | Pallets | All)
        → Quantity +/- (auto-save)
        → Review Drawer (slide up)
          → Submit Order
  → Orders Tab
    → View current order (edit/cancel/CSV)
    → View past orders (reorder/delete)


SALESMAN FLOW:
──────────────
Login (password)
  → Dashboard (stats + recent orders)
  → Orders (list → detail → edit/status/CSV)
  → Customers (list → detail)
    → Edit info
    → Catalog settings (prices/grouping/products)
    → Product manager (include/exclude/custom price)
    → Order history
    → New order for customer
  → Catalog (CRUD products) [not wireframed yet]
  → Reports (brand stats) [not wireframed yet]
```

---

*Wireframes v1 · Feb 17, 2025*
