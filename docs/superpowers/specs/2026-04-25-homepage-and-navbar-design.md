# Homepage Extension + Navbar Redesign — Design Spec

**Status:** draft for sign-off
**Date:** 2026-04-25
**Builds on:** [`docs/design-system.md`](../../design-system.md), [`docs/agent-briefs/homepage-redesign-brief.md`](../../agent-briefs/homepage-redesign-brief.md), [`docs/superpowers/specs/2026-04-25-surface-system-rebuild-design.md`](./2026-04-25-surface-system-rebuild-design.md)

## Context

The customer portal homepage at [`app/(portal)/portal/[token]/page.tsx`](../../../app/(portal)/portal/[token]/page.tsx) renders five components in a vertical stack — `PortalPageHeader`, `StartOrderHero`, `DraftResumeStrip`, `OrdersList`, `PastOrdersSection`. **That stack is the design and we keep it.** The homepage redesign brief at [`docs/agent-briefs/homepage-redesign-brief.md`](../../agent-briefs/homepage-redesign-brief.md) calls for **two new slots between `DraftResumeStrip` and `OrdersList`** — `AccountStatsCard` and `AnnouncementsStack` — plus a full admin-side announcements system to feed them. The five existing components stay where they are; nothing about them changes.

The navbar at [`components/layout/portal-top-bar.tsx`](../../../components/layout/portal-top-bar.tsx) is a 31-line `h-12` strip with a brand link on the left and a UserCircle icon on the right. It receives an unused `customerName` prop (flagged in the engineering handoff as cleanup). With the homepage gaining content density (stats + curated announcements + product spotlights), the navbar's role needs to be slightly more deliberate so it gives the page a sense of place without competing with the new content. Doctrine Rule 12 already codifies the navbar as page chrome (static, not sticky, account icon only) — this spec calls out the small adjustments: drop the unused prop, add a subpage mode so back-navigation reads consistently across portal pages.

This spec is the design+wireframe-rich input for an implementation chat. The brief itself is excellent on the announcements system; this spec adds the wireframes, defines the navbar half, and reconciles both with the post-rebuild design system (Panel primitive, doctrine rules 1-12, mobile viewport lock).

## Goals

1. **Homepage extension:** add `<AccountStatsCard>` + `<AnnouncementsStack>` between `DraftResumeStrip` and `OrdersList`, exactly as the brief specifies, with the 600px content cap on those two slots.
2. **AnnouncementsStack with five card types:** `text`, `image`, `image_text`, `product`, `specials_grid` — each with its own layout, all wrapped in the stack's `max-w-[600px]` container. Wireframes for each below.
3. **Admin side:** `AnnouncementsManager` (table + reorder + toggle), `AnnouncementDialog` (2-step compose: type picker → fields), `CustomerHomepageManager` (per-customer overrides), and the two new admin pages.
4. **Navbar redesign:** preserve the existing minimal shape; add a subpage mode that swaps the brand link for a page title; drop the unused `customerName` prop; codify against Doctrine Rule 12.
5. **Doctrine alignment:** every new component composes Panel for modals, follows the corner-radius rules, uses the established primitives (Money, StatusChip, Button, etc.).

## Non-goals

- No removal of `StartOrderHero`, `DraftResumeStrip`, `OrdersList`, or `PastOrdersSection`. They stay.
- No new homepage CTAs or "Continue draft / Start new order" cards beyond what those existing components already render.
- No backend wiring (migration, API routes, real types) — design only, mock data via the brief's `MOCK_ANNOUNCEMENTS` and `MOCK_STATS`.
- No changes to `lib/types.ts` — `Announcement` is locally declared in the new component files.
- No changes to admin pages outside `/admin/announcements` and `/admin/customers/[id]/homepage`.
- No new global routes; no auth changes.

## Wireframes — Homepage

### Mobile (375 × 812)

```
┌────────────────────────────────────────┐
│ Universal Beverages          [👤]     │ ← <PortalTopBar> (homepage mode, unchanged)
├────────────────────────────────────────┤
│                                        │
│  Maya — Corner Deli                    │ ← <PortalPageHeader title=greeting/>
│                                        │   (already exists — unchanged)
│  ┌──────────────────────────────────┐ │
│  │  Order for [Thu, May 1] [▾]      │ │ ← <StartOrderHero>
│  │                  [Start order →] │ │   (already exists — unchanged)
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ ● Draft for Apr 28 · 4 items   → │ │ ← <DraftResumeStrip>
│  └──────────────────────────────────┘ │   (already exists — unchanged)
│                                        │
│  ╔══════════════════════════════════╗ │ ← NEW: <AccountStatsCard>
│  ║ Your account · April 2026        ║ │   max-w-[600px] mx-auto
│  ║                                  ║ │
│  ║   48 cases ordered               ║ │   text-sm tabular-nums
│  ║   $1,240.00 total spend          ║ │   <Money/> for currency
│  ║   3 orders placed                ║ │
│  ╚══════════════════════════════════╝ │   bg-muted/50 rounded-xl px-4 py-4
│                                        │
│  ╔══════════════════════════════════╗ │ ← NEW: <AnnouncementsStack>
│  ║                                  ║ │   wraps in max-w-[600px] mx-auto
│  ║  ┌────────────────────────────┐ ║ │
│  ║  │ May Promotion              │ ║ │   AnnouncementCard (text)
│  ║  │ Free delivery on orders    │ ║ │
│  ║  │ over $200 this month.      │ ║ │
│  ║  │              [Learn more]  │ ║ │
│  ║  └────────────────────────────┘ ║ │
│  ║                                  ║ │
│  ║  ┌────────────────────────────┐ ║ │
│  ║  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ║ │   AnnouncementCard (image)
│  ║  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ║ │   16:7 hero image
│  ║  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ ║ │   gradient overlay
│  ║  │ Summer Launch  [Shop now]  │ ║ │
│  ║  └────────────────────────────┘ ║ │
│  ║                                  ║ │
│  ║  ┌────────────────────────────┐ ║ │
│  ║  │ ★ FEATURED PRODUCT         │ ║ │   AnnouncementCard (product)
│  ║  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ║ │   border-2 border-accent/30
│  ║  │ ▓▓ Cherry Coke 24/12oz ▓▓ │ ║ │
│  ║  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ║ │
│  ║  │ Cherry Coke 24/12oz        │ ║ │
│  ║  │ $32.99               [Add] │ ║ │   QuantitySelector or
│  ║  └────────────────────────────┘ ║ │   "Add to order" button
│  ║                                  ║ │
│  ║  ┌────────────────────────────┐ ║ │
│  ║  │ ★ Specials this week       │ ║ │   AnnouncementCard (specials_grid)
│  ║  │ ┌────┐┌────┐┌────┐         │ ║ │   bg-accent/5 border-accent/20
│  ║  │ │NEW ││SALE││    │         │ ║ │   3-col mobile, 4-col md+
│  ║  │ │img ││img ││img │         │ ║ │   ProductTile inside
│  ║  │ └────┘└────┘└────┘         │ ║ │
│  ║  └────────────────────────────┘ ║ │
│  ╚══════════════════════════════════╝ │
│                                        │
│  ── Upcoming & recent ─────────────    │ ← <OrdersList>
│  Apr 28 · Submitted · 24 items     →   │   (already exists — unchanged)
│  Apr 25 · Delivered · 18 items     →   │
│                                        │
│  ── Past orders ──────────────────     │ ← <PastOrdersSection>
│  [collapsed list, expandable]          │   (already exists — unchanged)
│                                        │
└────────────────────────────────────────┘
```

### Desktop (≥ 768px, layout column = max-w-3xl ≈ 768px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Universal Beverages                                          [👤]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────── max-w-3xl content column ──────────────────────┐ │
│  │                                                                │ │
│  │  Maya — Corner Deli                                            │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │  Order for Thu, May 1 [▾]              [Start →]       │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │ ● Draft for Apr 28 · 4 items                       →   │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  │                                                                │ │
│  │       ┌──────── max-w-[600px] mx-auto ───────────┐             │ │
│  │       │                                          │             │ │
│  │       │  ╔════════════════════════════════════╗  │             │ │
│  │       │  ║ Your account · April 2026          ║  │             │ │   ← AccountStatsCard
│  │       │  ║   48 cases · $1,240.00 · 3 orders  ║  │             │ │     centered, 600px max
│  │       │  ╚════════════════════════════════════╝  │             │ │
│  │       │                                          │             │ │
│  │       │  ╔════════════════════════════════════╗  │             │ │   ← AnnouncementsStack
│  │       │  ║ TextCard — May Promotion           ║  │             │ │     also 600px max
│  │       │  ╚════════════════════════════════════╝  │             │ │
│  │       │                                          │             │ │
│  │       │  ╔════════════════════════════════════╗  │             │ │
│  │       │  ║ ┌──── img ────┐ Title               ║  │             │ │   ← ImageTextCard
│  │       │  ║ │  40% width  │ Body                ║  │             │ │     md:flex-row
│  │       │  ║ │  square     │ [CTA]               ║  │             │ │
│  │       │  ║ └─────────────┘                     ║  │             │ │
│  │       │  ╚════════════════════════════════════╝  │             │ │
│  │       │                                          │             │ │
│  │       │  ╔════════════════════════════════════╗  │             │ │
│  │       │  ║ ★ Specials  ┌──┐┌──┐┌──┐┌──┐       ║  │             │ │   ← SpecialsGridCard
│  │       │  ║             │NW││SL││  ││  │       ║  │             │ │     md:grid-cols-4
│  │       │  ║             └──┘└──┘└──┘└──┘       ║  │             │ │
│  │       │  ╚════════════════════════════════════╝  │             │ │
│  │       │                                          │             │ │
│  │       └──────────────────────────────────────────┘             │ │
│  │                                                                │ │
│  │  ── Upcoming & recent ───────────────────────────              │ │
│  │  Apr 28 · Submitted · 24 items                          →      │ │
│  │  Apr 25 · Delivered · 18 items                          →      │ │
│  │                                                                │ │
│  │  ── Past orders ────────────────────────────────                │ │
│  │  [collapsed list, expandable]                                  │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

The page-level layout column stays `max-w-3xl mx-auto p-4 md:p-6` (already in `app/(portal)/portal/[token]/layout.tsx`). The new content zone (stats + announcements) is wrapped at `max-w-[600px] mx-auto` so it reads as a centered editorial spine, narrower than the order list above and below it. That visual narrowing is intentional — the content zone is curated content, not data; it shouldn't sprawl edge-to-edge in the page column.

## Wireframes — five announcement card types

The brief defines five card types. Wireframes for each at the 600px container width:

### TextCard

```
┌──────────────────────────────────────────────────────┐
│ May Promotion                                        │ ← title — text-base font-semibold
│ Free delivery on all orders over $200 this month.    │ ← body — text-sm text-muted-foreground
│ No code needed.                                      │
│                                       [Learn more]   │ ← CTA — Button variant=outline size=sm
└──────────────────────────────────────────────────────┘
  rounded-xl border bg-card px-4 py-4
```

CTA row only renders when `cta_label` is non-null. CTA opens `cta_url` in a new tab (`target="_blank" rel="noreferrer"`).

### ImageBannerCard

```
┌──────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← <img> aspect-[16/7] object-cover
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ ← gradient: black/70 → black/20 → transparent
│ Summer Launch                          [Shop now]    │ ← title text-white | CTA white border
└──────────────────────────────────────────────────────┘
  relative rounded-xl overflow-hidden
```

If `image_url` is null, render an `aspect-[16/7] bg-muted` placeholder with the gradient + title still visible. CTA gets `text-white border-white/50 hover:bg-white/10`.

### ImageTextCard

**Mobile (default):**

```
┌──────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────┐ │ ← <img> aspect-[16/9] rounded-lg
│ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │   object-cover
│ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │
│ └──────────────────────────────────────────────────┘ │
│ Title                                                │
│ Body text wraps below.                               │
│ [CTA]                                                │
└──────────────────────────────────────────────────────┘
  flex flex-col gap-4 rounded-xl border bg-card p-4
```

**Desktop (md+):**

```
┌──────────────────────────────────────────────────────┐
│ ┌──────────────┐ Title                               │
│ │  ▓▓▓ 40% ▓▓▓ │ Body text wraps below the title.    │
│ │  ▓▓▓ wide ▓▓ │ Multiple lines if needed.           │
│ │  ▓▓ square ▓ │ [CTA]                               │
│ └──────────────┘                                     │
└──────────────────────────────────────────────────────┘
  md:flex-row md:items-center
  image: md:w-[40%] aspect-square
```

### ProductSpotlightCard

```
┌──────────────────────────────────────────────────────┐
│ ★ FEATURED PRODUCT                                   │ ← text-[10px] uppercase tracking-widest
│                                                      │   text-accent
│ ┌──────────────────────────────────────────────────┐ │
│ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ← <img> aspect-square
│ │  ▓▓▓▓▓▓▓▓ Cherry Coke 24/12oz ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │   object-contain on white bg
│ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │
│ └──────────────────────────────────────────────────┘ │
│ Cherry Coke 24/12oz                                  │ ← product name
│ 24/12oz · $38.99                                     │ ← pack/price (Money component)
│ Optional salesman note from announcement.body.       │
│                                          [Add →]     │ ← if no draft: "Add to order" button
└──────────────────────────────────────────────────────┘   if has draft + qty>0: <Stepper>
  border-2 border-accent/30 rounded-xl bg-card p-4
```

**Qty interaction:** when `primaryDraftOrderId` is null, show a single accent button "Add to order" that opens a `<Panel variant="bottom-sheet">` date-picker (or in mock mode, fires a placeholder alert). When `primaryDraftOrderId` is non-null, render `<Stepper>` directly. The Stepper writes via `useAutoSavePortal` against the draft.

**Mock mode placeholder:** when `product` is null, render the card with a gray `aspect-square bg-muted` image area and "Product not found" text in the name slot. Layout still tests.

### SpecialsGridCard

```
┌──────────────────────────────────────────────────────┐
│ ★ Specials this week                                 │ ← text-sm font-semibold text-accent mb-2
│                                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐                           │ ← grid-cols-3 gap-2 (mobile)
│ │ NEW  │ │ SALE │ │      │                           │   md:grid-cols-4
│ │      │ │      │ │      │                           │
│ │ img  │ │ img  │ │ img  │                           │   <ProductTile> per item
│ └──────┘ └──────┘ └──────┘                           │
└──────────────────────────────────────────────────────┘
  rounded-xl border border-accent/20 bg-accent/5 p-3
```

The badge (`NEW` / `SALE`) is a per-product override stored in `announcement.badge_overrides[product.id]`. Renders as `absolute top-1 left-1 z-10 text-[9px] font-bold bg-accent text-white rounded px-1`. Tile click opens `<ProductPopout>` (existing component).

**Mock mode:** when `products` is empty, render 3-4 `aspect-square rounded-lg bg-muted animate-pulse` placeholder tiles in the grid. Layout tests without product data.

## Wireframes — Admin

### `/admin/announcements` (AnnouncementsManager)

```
┌──────────────────────────────────────────────────────────────┐
│ Announcements                              [+ New announcement]│ ← page header (top-right CTA)
├──────────────────────────────────────────────────────────────┤
│ [ Live ]  [ Scheduled ]                                       │ ← Tabs (components/ui/tabs.tsx)
├──────────────────────────────────────────────────────────────┤
│ ↕  Title           Type    Audience    Dates       Status    │ ← table header row
├──────────────────────────────────────────────────────────────┤
│ ↑↓ Summer Launch   image   All         May–        ● Live   …│   actions menu (Edit/Delete)
│ ↑↓ May Promo       text    [whlsl]     May 1-31    ● Live   …│
│ ↑↓ Cherry Coke     product All         —           ◯ Off    …│
│ ↑↓ Specials grid   grid    All         May 1-15    ● Live   …│
└──────────────────────────────────────────────────────────────┘
```

**Reorder:** ↑/↓ arrow buttons per row using `reorderByDrag` from `lib/reorder.ts`. After reorder, PATCH (in mock mode, just update local state with a `// TODO: wire up PATCH` comment).

**Toggle Active:** `Switch` component in the Status cell, optimistic update.

**Actions menu:** Edit (opens `AnnouncementDialog` with the row pre-filled), Delete (`window.confirm` for now).

**Tabs:**
- **Live** — `is_active === true && (starts_at == null || starts_at <= now) && (ends_at == null || ends_at > now)`
- **Scheduled** — `is_active === false || (starts_at != null && starts_at > now)`

### `AnnouncementDialog` — step 1 (type picker)

```
╔══════════════════════════════════════════════╗ ← <Panel variant="centered">
║  New announcement                       [×]  ║   max-w-md p-4
║  ─────────────────────────────────────────   ║
║                                              ║
║  Choose a content type:                      ║
║                                              ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐     ║   grid-cols-3 gap-2
║  │   Aā     │ │   ▓+Aā   │ │   ▓▓▓▓   │     ║   each card:
║  │  Text    │ │ Image+   │ │  Image   │     ║   rounded-xl border bg-card
║  │  card    │ │  text    │ │  banner  │     ║   p-3 text-center
║  └──────────┘ └──────────┘ └──────────┘     ║   hover:bg-muted/50
║                                              ║
║  ┌──────────┐ ┌──────────┐                  ║
║  │  ★ img   │ │  ★ ⊞⊞⊞  │                  ║
║  │ Product  │ │ Specials │                  ║
║  │ spotlight│ │  grid    │                  ║
║  └──────────┘ └──────────┘                  ║
║                                              ║
╚══════════════════════════════════════════════╝
```

Tap a card → advances to step 2 with `content_type` set.

### `AnnouncementDialog` — step 2 (fields)

```
╔══════════════════════════════════════════════╗
║  ←  New announcement: Image+text       [×]  ║   ← back arrow only when creating
║  ─────────────────────────────────────────   ║
║                                              ║
║  Image*       [ImageUploadField]             ║
║  Title*       [Input              ]          ║
║  Body         [Textarea           ]          ║
║  CTA label    [Input              ]          ║
║  CTA URL      [Input              ]          ║
║                                              ║
║  ─────────────────────────────────────────   ║
║                                              ║
║  Audience     [TagChipInput       ]          ║
║  Go live      [Input type=date    ]          ║
║  Expires      [Input type=date    ]          ║
║                                              ║
║  Active       [Switch  on/off]               ║
║                                              ║
║  ─────────────────────────────────────────   ║
║                          [Cancel]  [Save]    ║
╚══════════════════════════════════════════════╝
```

Fields shown depend on `content_type`. Common fields (audience, dates, active toggle) always visible at the bottom. Type-specific fields above the divider.

| content_type | Type-specific fields |
|---|---|
| `text` | Title*, Body, CTA label, CTA URL |
| `image` | Image*, Title, CTA label, CTA URL |
| `image_text` | Image*, Title*, Body, CTA label, CTA URL |
| `product` | Product ID*, Body (note), CTA label |
| `specials_grid` | Title, Product IDs (comma-sep), Badge overrides |

`*` = required for save. No Zod in mock mode — just non-empty checks.

The dialog is `<Panel variant="centered">` with `max-w-md` — when forms get long, the body scrolls within the panel (Panel inherits `overflow-hidden` and the body slot gets `overflow-y-auto`).

### `/admin/customers/[id]/homepage` (CustomerHomepageManager)

```
┌──────────────────────────────────────────────────────────────┐
│ Customers / Acme Deli / Homepage                              │ ← breadcrumb
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  DEALS                                                       │
│  Active pallet deals visible to all customers:               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ deal title · $89.99 · Save $12   [Hide for this customer]│ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Pinned deal for this customer only:                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [+ Pin a specific deal]                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ─────────────────────────────────────────────────────       │
│                                                              │
│  ANNOUNCEMENTS                                               │
│  Showing to this customer (tag match or all):                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Summer Launch                              [read-only]  │ │
│  │ May Promo                                  [read-only]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Created just for this customer:                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Acme exclusive promo                  [Edit] [Delete]   │ │
│  └────────────────────────────────────────────────────────┘ │
│  [+ Add announcement for this customer]                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

In mock mode, both lists carry hardcoded placeholder rows. The "Add announcement for this customer" button opens `AnnouncementDialog` with `audience_tags` pre-filled to `[customerId]` (or a per-customer marker — implementation detail).

## Wireframes — Navbar

The current navbar:

```
┌────────────────────────────────────────────────────────┐
│ Universal Beverages                              [👤] │
└────────────────────────────────────────────────────────┘
  border-b bg-background  h-12
  inner: max-w-3xl mx-auto px-4 md:px-6
```

This is correct for the homepage and meets Doctrine Rule 12. **Two adjustments for this design pass:**

### Adjustment 1 — drop the unused `customerName` prop

The `customerName` prop is computed in the layout, passed in, and never rendered. Remove it. The layout's `resolveCustomerToken` call still happens (it's the token-validation gate); just don't pass the result into the topbar.

### Adjustment 2 — subpage mode

On subpages (`/portal/[token]/order/...`, `/portal/[token]/orders`, `/portal/[token]/account`), the brand link is replaced by the page title and a back-arrow. Keeps the navbar's role (page chrome + account icon) without making it more complex.

**Subpage navbar:**

```
┌────────────────────────────────────────────────────────┐
│ ← Order for Thu, May 1                          [👤] │ ← back arrow + page title
└────────────────────────────────────────────────────────┘
  border-b bg-background  h-12
```

**Implementation note:** `<PortalPageHeader>` already renders an in-content back button (`back={{ href }}` or `'history'`). The navbar's back-arrow on subpages is **redundant** if the page already renders `<PortalPageHeader>` with a back prop. Implementation chat decides:
- (A) Keep navbar minimal (homepage shape only); rely on `<PortalPageHeader>` for back-navigation on subpages. **Recommended.** Lowest risk; no per-route navbar logic. The navbar stays a 31-line component.
- (B) Make the navbar route-aware (read `usePathname()`, switch to subpage mode on non-homepage routes). Requires marking `PortalTopBar` `'use client'`.

This spec recommends **(A)** — leave the navbar as-is shape-wise, drop the unused prop, and codify against Rule 12. The subpage back-navigation is already solved by `<PortalPageHeader>`. If user testing later shows confusion, revisit.

### Doctrine Rule 12 compliance checklist

The current navbar already:
- [x] `border-b bg-background` (page chrome, not glass).
- [x] No `fixed` positioning (static, scrolls with page).
- [x] Account icon as the only persistent affordance (right side).
- [x] Brand link demotes to muted text.
- [x] No primary CTAs in the topbar.
- [x] No account dropdown.

Post-this-spec it adds:
- [x] No unused props (drop `customerName`).
- [x] No glass treatment (already the case — confirmed against Rule 12).

The navbar redesign is therefore a **minimal cleanup**: drop one prop. The "redesign" framing is mostly codification — the existing shape is the right shape; this spec makes that explicit and points future agents at Rule 12 to keep them from over-building.

## Code-change list

### Modify

| Path | Change |
|---|---|
| `app/(portal)/portal/[token]/page.tsx` | Slot in `<AccountStatsCard>` after `<DraftResumeStrip>` and `<AnnouncementsStack>` after that, both wrapped in `max-w-[600px] mx-auto`. Pass `MOCK_STATS` and `MOCK_ANNOUNCEMENTS` (declared in-page) until backend wiring lands. The existing five components stay where they are. |
| `app/(portal)/portal/[token]/layout.tsx` | Drop the `customerName` calculation and the `customerName` prop passed to `<PortalTopBar>`. Keep `resolveCustomerToken` for its side-effect (404 if invalid). |
| `components/layout/portal-top-bar.tsx` | Remove the `customerName` prop. Component shape unchanged. |
| `components/admin/admin-nav.tsx` | Add `Announcements` link in the dropdown after `Reports` (per the brief). |

### Create

**Customer-portal components:**

| Path | What |
|---|---|
| `components/portal/announcements-stack.tsx` | Server component. Wraps a list of `<AnnouncementCard>` in `mx-auto w-full max-w-[600px] space-y-4`. Returns `null` when `announcements.length === 0`. Type `Announcement` declared locally. |
| `components/portal/announcement-card.tsx` | Client component. Switches on `content_type` and renders one of five sub-renderers (`TextCard`, `ImageBannerCard`, `ImageTextCard`, `ProductSpotlightCard`, `SpecialsGridCard`) — all defined locally inside this file, not exported. |
| `components/portal/account-stats-card.tsx` | Server component. Renders the stats panel. Returns `null` when all three counts are zero (new customer). Wraps in `max-w-[600px] mx-auto`. |

**Admin components:**

| Path | What |
|---|---|
| `components/admin/announcements-manager.tsx` | Client component. Tabs (Live / Scheduled), table with reorder arrows, Active switch, Edit/Delete actions, "+ New announcement" button that opens `<AnnouncementDialog>`. In mock mode, all state mutations are local-only with `// TODO: wire up PATCH` comments. |
| `components/admin/announcement-dialog.tsx` | Client component. 2-step `<Panel variant="centered">`: type picker → fields. When editing, opens directly to step 2. |
| `components/admin/customer-homepage-manager.tsx` | Client component. Per-customer overrides UI (deals + announcements). Mock mode populates both sections with hardcoded placeholders. |

**Admin pages:**

| Path | What |
|---|---|
| `app/(admin)/admin/announcements/page.tsx` | RSC. Calls `requirePageAuth(['salesman'])`. Renders `<AnnouncementsManager initialAnnouncements={MOCK_ANNOUNCEMENTS} />`. |
| `app/(admin)/admin/customers/[id]/homepage/page.tsx` | RSC. Calls `requirePageAuth(['salesman'])`. Renders breadcrumb + `<CustomerHomepageManager customerId={id} customerName="…" />`. |

**Doc:**

| Path | What |
|---|---|
| `docs/handoff/homepage-redesign.md` | Engineering handoff log per the brief's REQUIRED section. Summary table at top, one entry per `MOCK_*` / `// TODO` introduced. Pre-existing lib paths are reused unchanged. |

### Delete

None. The existing five components stay. The `customerName` prop drop is a modification, not a deletion of any file.

## Doctrine compliance

This change must respect every rule in [`docs/design-system.md`](../../design-system.md). Specific checks:

- **Rule 2 (glass is for floating surfaces):** No glass on the new homepage cards. `<AccountStatsCard>` is `bg-muted/50`. `<AnnouncementCard>` variants use `bg-card`, `bg-accent/5`, or image+overlay — all non-glass. The cart bar is the only glass-like surface (and it's not on the homepage).
- **Rule 5 (corner radii):** All cards `rounded-xl`. Image children inside ImageTextCard use `rounded-lg` (slightly smaller for nested elements is acceptable per the doctrine spirit; if agents want strict `rounded-xl` everywhere, that's also fine — pick during implementation).
- **Rule 6 (one accent per region):** The announcement zone has multiple amber-accent signals (the `★ FEATURED PRODUCT` label, the SpecialsGrid border, the per-card CTAs). This needs care — at most one accent per visible region within a card. ProductSpotlightCard's "Add to order" button is the accent; the `★` label is muted text-accent without filled background. SpecialsGridCard's border is the accent; per-tile badges are NOT accent — they're solid `bg-accent` solid white-text labels (a different accent role per the brief). The implementation chat should keep an eye on this — if the ProductSpotlight CTA AND the `★` label both look like CTAs at a glance, demote the label.
- **Rule 8 (hover and focus signals):** All clickable cards/buttons need hover. The `Button` primitive handles its own. The type-picker cards in `<AnnouncementDialog>` step 1 use `hover:bg-muted/50` per the brief.
- **Rule 9 (Panel variants):** `<AnnouncementDialog>` uses `<Panel variant="centered">`. The brief mentions a "date-picker sheet in ProductSpotlight" — that's `<Panel variant="bottom-sheet">`. No ad-hoc DialogContent overrides.
- **Rule 12 (navbar):** Already covered — the navbar redesign is a prop drop + codification.

## Verification

### Static checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

All four must pass. Pre-existing lint warnings unrelated to this work are acceptable.

### Touch checklist (mobile + desktop)

- [ ] Homepage renders the existing five components plus two new slots in the order: PageHeader, StartOrderHero, DraftResumeStrip, **AccountStatsCard**, **AnnouncementsStack**, OrdersList, PastOrdersSection.
- [ ] AccountStatsCard appears with mock stats (48 cases / $1,240 / 3 orders); month label reads "April 2026" or current month.
- [ ] AccountStatsCard renders `null` when all three values are zero.
- [ ] AnnouncementsStack renders one card per announcement type from the mock array.
- [ ] TextCard shows title + body + CTA outline button.
- [ ] ImageBannerCard shows image with gradient overlay + title + white-bordered CTA.
- [ ] ImageTextCard is `flex-col` on mobile, `md:flex-row md:items-center` on desktop.
- [ ] ProductSpotlightCard renders with `border-2 border-accent/30`; in mock mode shows "Product not found" placeholder.
- [ ] SpecialsGridCard renders with `border-accent/20 bg-accent/5`; in mock mode shows 4 placeholder tiles.
- [ ] Both new slots are capped at `max-w-[600px]` on desktop (centered, narrower than the page column above and below).
- [ ] On mobile (375px), both slots fill the page column edge-to-edge.
- [ ] Navbar still shows brand link + account icon. The `customerName` prop is gone from `<PortalTopBar>`'s signature.
- [ ] `<PortalPageHeader>` continues to render the back-arrow on subpages (Order, Orders, Account) — the navbar doesn't.
- [ ] `/admin/announcements` shows the `<AnnouncementsManager>` with mock rows; tabs (Live/Scheduled) filter correctly.
- [ ] "+ New announcement" opens `<AnnouncementDialog>` step 1 (type picker, 5 cards).
- [ ] Tapping a type advances to step 2 with the right type-specific fields visible.
- [ ] Step 2 "Back" returns to step 1 (creating only).
- [ ] `<AnnouncementDialog>` is centered, `<Panel variant="centered">` shape, glass-blur overlay.
- [ ] Reorder arrows in `<AnnouncementsManager>` update local sort order; toast or no-op confirms.
- [ ] Active switch updates local state.
- [ ] `/admin/customers/[id]/homepage` loads with `<CustomerHomepageManager>` showing both sections (deals + announcements) populated with mock placeholders.
- [ ] Admin nav has "Announcements" in the dropdown after "Reports".
- [ ] `docs/handoff/homepage-redesign.md` exists with a summary table and at least one entry per `MOCK_*` and per `// TODO` comment introduced.

### Doctrine cross-check

- [ ] No new uses of deleted tokens (`surfaceOverlay`, `surfaceFloating`, `surfaceOverlayPrimary`).
- [ ] No new `<DialogContent>` ad-hoc overrides — every modal uses `<Panel variant="…">`.
- [ ] No `rounded-md` / `rounded-2xl` / `rounded-3xl` on customer-surface containers (Rule 5).
- [ ] At most one accent-tinted button visible per card (Rule 6).
- [ ] All buttons have hover/focus signals (Rule 8 — handled by `<Button>`).

## Risks and mitigations

- **Five card-type variants in one file.** `<AnnouncementCard>` will be ~300+ lines if all five sub-renderers live inside. The brief says they should — keeps the switch explicit and the file's responsibility cohesive. Mitigation: if it gets unmanageable in implementation, the agent can extract sub-renderers to private files in a `components/portal/announcement-cards/` folder, but only with a comment justifying the split.
- **600px content cap on a 768px+ page column.** Looks deliberately narrow on the homepage. That's intended — it makes the editorial content read as curated, not data. If user testing shows it looks broken/centered-and-floating, the implementation chat can revisit (raising to 720px or full-bleed). No code consequence for this spec.
- **ProductSpotlightCard with no draft.** When `primaryDraftOrderId` is null, the card needs a way to start an order so the customer can add the product. Brief says "open a date-picker sheet" — that's `<Panel variant="bottom-sheet">`. In mock mode, a placeholder alert is fine. Real wiring is a backend task. Don't over-engineer in this design pass.
- **Multiple curated badges (`NEW`, `SALE`) in the same SpecialsGrid.** The badge is per-product via `announcement.badge_overrides`. Doctrine Rule 6 allows multiple in the same region because the badges are NOT primary CTAs — they're labels. Keep them visually distinct from the CTA Button (smaller, no shadow, no hover state).
- **Admin-side breadcrumb on `/admin/customers/[id]/homepage`.** The brief uses inline breadcrumb markup, not a shared `<Breadcrumb>` primitive. Acceptable for design phase. If the admin design system has a breadcrumb primitive, prefer it; otherwise inline is fine.
- **Mock data leaks into prod.** The `MOCK_ANNOUNCEMENTS` and `MOCK_STATS` constants live in the page RSCs. They MUST be removed before backend wiring lands. The handoff log is the safety net.

## Out of scope

- Backend: Postgres migration for the `announcements` table, GET/POST/PATCH/DELETE API routes, Zod schemas in `lib/server/schemas.ts`, type updates in `lib/types.ts`. All deferred to a separate backend task. The handoff log is the contract.
- Real account stats query (cases/spend/orders this month) — backend task.
- Searchable product select inside `<AnnouncementDialog>` for `product_id` and `product_ids` fields — plain-text Input is fine for design phase.
- Per-customer pallet pinning (the "Pinned deal for this customer only" affordance in `<CustomerHomepageManager>`) — UI shell is enough; backend wiring deferred.
- Drag-and-drop reorder in `<AnnouncementsManager>` — up/down arrows are fine.
- Image upload validation, size limits, CDN routing — `<ImageUploadField>` already exists; reuse.
- Analytics: tracking which announcements get clicked. Defer.

## Plan format (next step)

Once approved, the implementation plan will follow the same pattern as the surface rebuild and doctrine pass: numbered tasks with full code blocks, each one a self-contained commit. Estimated 9-12 tasks across:

1. Build `<AccountStatsCard>` (pure presentational, mock data).
2. Build `<AnnouncementsStack>` wrapper (just the layout container).
3. Build `<AnnouncementCard>` with the five sub-renderers (TextCard, ImageBannerCard, ImageTextCard, ProductSpotlightCard, SpecialsGridCard).
4. Wire `<AccountStatsCard>` + `<AnnouncementsStack>` into `app/(portal)/portal/[token]/page.tsx` with `MOCK_*` constants.
5. Drop the unused `customerName` prop from `<PortalTopBar>` and the layout.
6. Build `<AnnouncementDialog>` (2-step: type picker → fields).
7. Build `<AnnouncementsManager>` (table + tabs + reorder + actions).
8. Build `/admin/announcements/page.tsx`.
9. Build `<CustomerHomepageManager>`.
10. Build `/admin/customers/[id]/homepage/page.tsx`.
11. Add the Announcements link to `<AdminNav>`.
12. Write `docs/handoff/homepage-redesign.md`. Final verification + Workers deploy.

That's the plan when you say go.
