# Agent Brief — Homepage & Announcements Redesign (Design Only)

## Your task

Design the UI for the customer homepage content zone and the admin announcements
system. This is a **design-only task** — JSX and CSS only.

**Do not:**
- Run database migrations
- Create or modify API routes
- Modify `lib/types.ts` for real (use local type declarations where needed)
- Modify server-side data fetching in the portal page RSC

You will use **mock data** to build and verify the UI. The backend (migration,
API routes, Zod schemas) will be wired up in a separate task.

When you are done, every file you touched must pass:
```
npm run typecheck
npm run lint
```

---

## What you have access to

You have the full codebase. The files most relevant to this task are:

```
app/(portal)/portal/[token]/page.tsx              ← portal homepage RSC — extend
components/portal/start-order-hero.tsx            ← unchanged, keep
components/portal/draft-resume-strip.tsx          ← unchanged, keep
components/portal/past-orders-section.tsx         ← unchanged, keep
components/orders/orders-list.tsx                 ← unchanged, keep
components/portal/portal-page-header.tsx          ← unchanged, keep
components/catalog/product-tile.tsx               ← reuse in SpecialsGridCard
components/catalog/product-popout.tsx             ← reuse in SpecialsGridCard, ProductSpotlightCard
components/catalog/quantity-selector.tsx          ← reuse in ProductSpotlightCard
lib/hooks/useAutoSavePortal.ts                    ← reuse in AnnouncementCard
lib/portal-order-save.ts                          ← reuse buildPortalItemSaveRequest
components/admin/admin-nav.tsx                    ← add Announcements link
components/admin/catalog-products-manager.tsx     ← read for reorder/table patterns
lib/reorder.ts                                    ← reuse reorderByDrag
lib/types.ts                                      ← read for existing types
app/globals.css                                   ← read for design tokens
components/ui/sheet.tsx                           ← use for date-picker sheet in ProductSpotlight
components/ui/dialog.tsx                          ← use for AnnouncementDialog
components/ui/tabs.tsx                            ← use in AnnouncementsManager
components/ui/switch.tsx                          ← use for is_active toggle
components/ui/input.tsx                           ← use in AnnouncementDialog
components/ui/tag-chip-input.tsx                  ← use for audience_tags field
components/ui/image-upload-field.tsx              ← use for image_url field
components/ui/money.tsx                           ← use in AccountStatsCard
components/ui/page-header.tsx                     ← use in admin pages
```

Read each of these files before you start writing anything.

---

## Design system rules

> Updated 2026-04-25 for the surface-system rebuild. Live reference is [`docs/design-system.md`](../design-system.md) (Doctrine rules 1–12) plus the upcoming [homepage + navbar design spec](../superpowers/specs/2026-04-25-homepage-and-navbar-design.md).

- **Colors:** `--primary` = navy, `--accent` = amber. Use CSS vars not hex.
- **Backdrop:** All Panel and AlertDialog overlays use `bg-foreground/30 backdrop-blur-md`. Never solid dark.
- **Buttons:** Size to content. No `w-full` except bottom-sheet action rows + the review drawer's Submit.
- **Modals:** `<Panel variant="centered">` for creation/input forms; `<Panel variant="bottom-sheet">` for panels anchored to the bottom; `<Panel variant="side-sheet">` for secondary panels stacked over a bottom-sheet. `<AlertDialog>` for destructive confirmations only.
- **Cart bar:** plain `bg-background` with `border border-foreground/10 shadow-2xl`. NOT glass-blur. The cart bar belongs only on the order builder — the homepage does NOT render `<CartReviewSurface>`.
- **Rounded cards:** `rounded-xl` is the standard card shape. No `rounded-md`, no `rounded-2xl`, no `rounded-3xl`.
- **Amber accent signals:** `border-accent/20`, `bg-accent/5`, `text-accent` — these signal curated/featured content. At most one accent-tinted affordance per visible region (Doctrine Rule 6).

---

## Current homepage (what exists today)

`app/(portal)/portal/[token]/page.tsx` is a pure RSC. It renders:

```
PortalPageHeader   ← greeting / business name
StartOrderHero     ← date picker + New Order button
DraftResumeStrip   ← draft chips if any drafts
OrdersList         ← non-draft current orders (upcoming & recent)
PastOrdersSection  ← collapsed past orders list
```

Nothing else. No content zone, no stats, no announcements.

---

## Target page structure after redesign

The page gains 2 new slots between `DraftResumeStrip` and `OrdersList`.
Everything else stays in place.

```
PortalPageHeader
StartOrderHero
DraftResumeStrip
AccountStatsCard      ← NEW (right after strip)
AnnouncementsStack    ← NEW (content zone)
OrdersList
PastOrdersSection
```

Since this is design-only, pass mock data to the new components:

```tsx
// Mock announcements for development
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    content_type: 'text',
    title: 'May Promotion',
    body: 'Free delivery on all orders over $200 this month. No code needed.',
    cta_label: 'Learn more',
    cta_url: '#',
    image_url: null,
    product_id: null,
    product_ids: [],
    badge_overrides: {},
    audience_tags: [],
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Add more to test each content type
]

// Mock stats
const MOCK_STATS = {
  casesThisMonth: 48,
  spendThisMonth: 1240,
  ordersThisMonth: 3,
}
```

Wrap the new component slots so they are easy to remove when real data lands:

```tsx
{/* TODO: replace with real data from announcements query */}
<AccountStatsCard
  casesThisMonth={MOCK_STATS.casesThisMonth}
  spendThisMonth={MOCK_STATS.spendThisMonth}
  ordersThisMonth={MOCK_STATS.ordersThisMonth}
/>

{/* TODO: replace with real data from announcements query */}
<AnnouncementsStack
  announcements={MOCK_ANNOUNCEMENTS}
  token={token}
  primaryDraftOrderId={draftsResult.rows[0]?.id ?? null}
  showPrices={profile.show_prices}
/>
```

---

## Local types (define in component files, not in lib/types.ts)

Do not modify `lib/types.ts`. Define these types locally in the new files:

```tsx
// Define at top of announcements-stack.tsx or announcement-card.tsx
export type AnnouncementContentType =
  | 'text'
  | 'image'
  | 'image_text'
  | 'product'
  | 'specials_grid'

export interface Announcement {
  id: string
  content_type: AnnouncementContentType
  title: string | null
  body: string | null
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  product_id: string | null
  product_ids: string[]
  badge_overrides: Record<string, string>   // productId → badge label
  audience_tags: string[]
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
```

Import `Announcement` from the stack/card file wherever it's needed.
When `lib/types.ts` is updated in the backend task, swap the import then.

---

## Desktop width rule — enforced by the stack wrapper

On desktop the page column is ~900–1100px wide. Announcement cards must not
stretch to fill it. The `AnnouncementsStack` wrapper enforces the cap for all
cards — no individual card needs to know about it.

```tsx
// components/portal/announcements-stack.tsx
<div className="mx-auto w-full max-w-[600px] space-y-4">
  {announcements.map(a => (
    <AnnouncementCard key={a.id} announcement={a} ... />
  ))}
</div>
```

`AccountStatsCard` must also respect this width. The easiest way: wrap the
`AccountStatsCard` in the same `mx-auto max-w-[600px]` container in the page,
or apply `max-w-[600px] mx-auto` directly on the card's root div.

---

## New component: `AnnouncementsStack`

**File:** `components/portal/announcements-stack.tsx`
**Type:** Server Component (async)

```tsx
interface AnnouncementsStackProps {
  announcements: Announcement[]
  token: string
  primaryDraftOrderId: string | null
  showPrices: boolean
}
```

For mock-data mode, no extra server fetching needed. Just iterate:

```tsx
export async function AnnouncementsStack({
  announcements,
  token,
  primaryDraftOrderId,
  showPrices,
}: AnnouncementsStackProps) {
  if (announcements.length === 0) return null

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-4">
      {announcements.map(a => (
        <AnnouncementCard
          key={a.id}
          announcement={a}
          token={token}
          primaryDraftOrderId={primaryDraftOrderId}
          showPrices={showPrices}
        />
      ))}
    </div>
  )
}
```

When the backend task lands, this becomes async and resolves product rows for
`specials_grid` and `product` cards — for now, pass `null` and render
placeholders for those card types.

---

## New component: `AnnouncementCard`

**File:** `components/portal/announcement-card.tsx`
**Type:** Client Component (`'use client'`)

```tsx
interface AnnouncementCardProps {
  announcement: Announcement
  token: string
  primaryDraftOrderId: string | null
  showPrices: boolean
  resolvedProduct?: CatalogProduct | null    // for 'product' type — null in mock mode
  resolvedProducts?: CatalogProduct[]        // for 'specials_grid' type — [] in mock mode
}
```

`CatalogProduct` comes from `@/lib/types`. Read `lib/types.ts` for the exact shape.

### Internal switch

```tsx
switch (announcement.content_type) {
  case 'text':          return <TextCard a={announcement} />
  case 'image':         return <ImageBannerCard a={announcement} />
  case 'image_text':    return <ImageTextCard a={announcement} />
  case 'product':       return <ProductSpotlightCard a={announcement} product={resolvedProduct} ... />
  case 'specials_grid': return <SpecialsGridCard a={announcement} products={resolvedProducts ?? []} ... />
}
```

Each sub-renderer is a local function inside this file — not exported.

---

### TextCard sub-renderer

```
┌──────────────────────────────────────┐
│ {title}                              │  ← text-base font-semibold
│ {body}                               │  ← text-sm text-muted-foreground mt-1
│                        [{cta_label}] │  ← Button variant="outline" size="sm"
└──────────────────────────────────────┘
rounded-xl border bg-card px-4 py-4
```

Only render the CTA row if `cta_label` is non-null.
CTA opens `cta_url` in a new tab (`target="_blank"`).

---

### ImageBannerCard sub-renderer

Full-width image with a gradient overlay at the bottom. Title and CTA sit on
the overlay — always legible regardless of photo.

```
┌──────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← aspect-[16/7] object-cover
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  ← gradient overlay
│ {title}                 [{cta_label}]│  ← text-white, cta: white border
└──────────────────────────────────────┘
rounded-xl overflow-hidden
```

CSS structure:
```tsx
<div className="relative rounded-xl overflow-hidden">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img
    src={a.image_url!}
    alt={a.title ?? ''}
    className="w-full aspect-[16/7] object-cover"
  />
  {/* Gradient overlay */}
  <div className="absolute inset-x-0 bottom-0
                  bg-gradient-to-t from-black/70 via-black/20 to-transparent
                  px-4 pb-4 pt-12
                  flex items-end justify-between gap-3">
    {a.title && (
      <span className="text-white font-semibold text-base">{a.title}</span>
    )}
    {a.cta_label && (
      <a href={a.cta_url ?? '#'} target="_blank" rel="noreferrer">
        <Button variant="outline"
          className="text-white border-white/50 hover:bg-white/10 shrink-0">
          {a.cta_label}
        </Button>
      </a>
    )}
  </div>
</div>
```

If `image_url` is null, render a placeholder `bg-muted` box with the same aspect ratio.

---

### ImageTextCard sub-renderer

Mobile: image on top, text below. Desktop: image left (~40%), text right (~60%).

```tsx
<div className="flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4
                md:flex-row md:items-center">
  {/* Image */}
  <div className="md:w-[40%] shrink-0">
    {a.image_url ? (
      <img src={a.image_url} alt={a.title ?? ''} 
           className="w-full aspect-[16/9] md:aspect-square object-cover rounded-lg" />
    ) : (
      <div className="w-full aspect-[16/9] md:aspect-square rounded-lg bg-muted" />
    )}
  </div>
  {/* Text */}
  <div className="flex flex-col gap-2">
    {a.title && <p className="font-semibold text-base">{a.title}</p>}
    {a.body && <p className="text-sm text-muted-foreground">{a.body}</p>}
    {a.cta_label && (
      <a href={a.cta_url ?? '#'} target="_blank" rel="noreferrer" className="self-start mt-1">
        <Button variant="outline" size="sm">{a.cta_label}</Button>
      </a>
    )}
  </div>
</div>
```

---

### ProductSpotlightCard sub-renderer

Highlights a single product as a featured/special item.
Amber border signals it is curated. Uses the product's image as the hero.

```
MOBILE — flex-col (image hero top, text + qty below)
DESKTOP — flex-row (image ~45% left, text + qty right)

┌─────────────────────────────────────────┐
│ ★ FEATURED PRODUCT                       │  ← text-[10px] uppercase tracking-widest
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  ← product image, aspect-square
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │     object-contain on white bg
│ Product Name                             │
│ 24/12oz · $38.99                        │
│ Optional salesman note                   │
│                              [Add →]    │  ← if no draft: "Add to order" btn
└─────────────────────────────────────────┘
border-2 border-accent/30 rounded-xl bg-card
```

When `product` is null (mock mode), render a placeholder card with a gray image box
and the text "Product not found" in the product name slot — this lets you test the
layout before the backend wires up the product join.

**Qty state:**
```tsx
const [qty, setQty] = useState(0)
// If primaryDraftOrderId is null, show "Add to order" button instead of qty selector
```

The qty selector (`QuantitySelector`) replaces the CTA button when `primaryDraftOrderId`
is non-null and `qty > 0`. When it's null show a button that opens a date-picker sheet
(use existing `StartOrderHero`-style interaction, or a simple placeholder alert in mock mode).

---

### SpecialsGridCard sub-renderer

A curated product tile grid with amber accent signals. Reuses `ProductTile` and
`ProductPopout` exactly as on the order page.

```
┌──────────────────────────────────────┐
│ ★ {title}                            │  ← text-sm font-semibold text-accent mb-2
│                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐          │  ← 3 cols mobile, 4 cols md+
│ │ NEW  │ │ SALE │ │      │          │     badge overlay: absolute top-1 left-1
│ │ img  │ │ img  │ │ img  │          │     text-[9px] font-bold bg-accent text-white
│ └──────┘ └──────┘ └──────┘          │     rounded px-1
└──────────────────────────────────────┘
rounded-xl border border-accent/20 bg-accent/5 p-3
```

When `products` is empty (mock mode), render 3–4 gray placeholder tiles using
the same grid layout — visible for testing layout before product data lands.

```tsx
<div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
  <p className="text-sm font-semibold text-accent mb-2">
    ★ {a.title ?? 'Specials this week'}
  </p>
  <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
    {products.length > 0
      ? products.map(p => (
          <div key={p.id} className="relative">
            {/* badge overlay */}
            {a.badge_overrides[p.id] && (
              <span className="absolute top-1 left-1 z-10
                               text-[9px] font-bold bg-accent text-white rounded px-1">
                {a.badge_overrides[p.id]}
              </span>
            )}
            {/* Note: ProductTile's current API is `quantity` / `onOpen` /
                `overlaySlot` (not `qty` / `onClick` / `showPrice`). Pass an
                inline <Stepper /> via `overlaySlot` if the homepage needs
                quantity controls; pass nothing if tapping the tile should
                only open the popout. `showPrices` is read by the popout
                itself, not by the tile. */}
            <ProductTile
              product={p}
              quantity={quantities[p.id] ?? 0}
              onOpen={() => setOpenProductId(p.id)}
            />
          </div>
        ))
      : /* placeholder tiles for mock mode */
        Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
        ))
    }
  </div>
  {openProductId && (
    <ProductPopout
      product={products.find(p => p.id === openProductId)!}
      qty={quantities[openProductId] ?? 0}
      onQtyChange={(q) => handleQtyChange(openProductId, q)}
      onClose={() => setOpenProductId(null)}
      showPrice={showPrices}
    />
  )}
</div>
```

Read `ProductTile` and `ProductPopout` to get the exact prop names before implementing.

---

## New component: `AccountStatsCard`

**File:** `components/portal/account-stats-card.tsx`
**Type:** Server Component (data passed in, no client state)

```tsx
interface AccountStatsCardProps {
  casesThisMonth: number
  spendThisMonth: number   // in dollars, e.g. 1240.50
  ordersThisMonth: number
}
```

```
┌──────────────────────────────────────┐
│ Your account · {month year}          │  ← text-sm font-medium text-muted-foreground
│                                      │
│  48 cases ordered                    │  ← text-sm, numbers use font-feature-settings tabular
│  $1,240.00 total spend               │  ← use Money component for currency
│  3 orders placed                     │
└──────────────────────────────────────┘
rounded-xl bg-muted/50 px-4 py-4 max-w-[600px] mx-auto
```

Render `null` if all three values are 0 (new customer — empty stats not helpful).

The month year label: `new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })`.

---

## Admin: `AnnouncementsManager`

**File:** `components/admin/announcements-manager.tsx`
**Type:** Client Component

```tsx
interface AnnouncementsManagerProps {
  initialAnnouncements: Announcement[]
}
```

Read `components/admin/catalog-products-manager.tsx` first — it has the exact
pattern for the table with up/down arrow reorder buttons and inline toggle.
Follow that pattern.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  [Live]  [Scheduled]                                  │ ← Tabs from components/ui/tabs.tsx
├──────────────────────────────────────────────────────┤
│  Title          Type     Audience    Dates   Status  [Actions]
│  Summer Launch  Image    All         May–    ● Live   [Edit][Del]
│  May Promo      Text     [wholesale] May 1-31● Live   [Edit][Del]
└──────────────────────────────────────────────────────┘
```

**Tab logic:**
- **Live** tab: `is_active = true`
- **Scheduled** tab: `is_active = false` OR `starts_at` is in the future

**Reorder:** Up/Down arrow buttons (no drag) using `reorderByDrag` from `lib/reorder.ts`.
After reorder, PATCH to `/api/admin/announcements/[id]` with `{ sort_order: newOrder }`.
In mock mode, just update local state without the PATCH — add a `// TODO: wire up PATCH` comment.

**Toggle is_active:** `Switch` component, optimistic update.
In mock mode, just update local state — add a `// TODO: wire up PATCH` comment.

**Actions:** Edit button → opens `AnnouncementDialog` with announcement pre-filled.
Delete button → confirmation (`window.confirm` is acceptable for now) → removes from list.
In mock mode, just remove from local state.

---

## Admin: `AnnouncementDialog`

**File:** `components/admin/announcement-dialog.tsx`
**Type:** Client Component

2-step compose flow inside a centered `Dialog` component (`w-[calc(100%-2rem)] max-w-lg`).

**Step 1 — type picker:**

```
╔══════════════════════════════════════════════╗
║  New Announcement                      [×]  ║
║                                              ║
║  Choose a content type:                      ║
║                                              ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐     ║
║  │  Aā      │ │  ▓+Aā    │ │  ▓▓▓▓▓▓  │     ║
║  │  Text    │ │ Img+Text │ │  Image   │     ║
║  │  card    │ │  split   │ │  banner  │     ║
║  └──────────┘ └──────────┘ └──────────┘     ║
║  ┌──────────┐ ┌──────────┐                  ║
║  │  ★ img   │ │  ★ ⊞⊞⊞  │                  ║
║  │ Product  │ │ Specials │                  ║
║  │ spotlight│ │  grid    │                  ║
║  └──────────┘ └──────────┘                  ║
╚══════════════════════════════════════════════╝
```

Type picker cards: `grid grid-cols-3 gap-2` with card buttons.
Each card: `rounded-xl border bg-card p-3 text-center hover:bg-muted/50
           cursor-pointer transition-colors text-sm`.
An icon or short ASCII visual above the label makes it scannable.

**Step 2 — fields:**

Common fields (all types):
- **Audience tags** — `TagChipInput` (`components/ui/tag-chip-input.tsx`)
- **Go live** — `Input type="date"` labeled "Go live" (optional)
- **Expires** — `Input type="date"` labeled "Expires" (optional)
- **Active** — `Switch` toggle labeled "Active"

Type-specific fields (shown below common fields):
```
text:          Title*  Body  CTA label  CTA URL
image:         Image (ImageUploadField)*  Title  CTA label  CTA URL
image_text:    Image (ImageUploadField)*  Title*  Body  CTA label  CTA URL
product:       Product ID* (plain text Input for now)  Body (note)  CTA label
specials_grid: Title  Product IDs (comma-sep text Input for now)  Badge overrides (skip)
```

For `product` and `specials_grid` types, use a plain `Input` for product ID fields
in mock mode — add `// TODO: replace with searchable product select` comment.

Form state: `useState` with a flat object. No Zod validation in this mock-mode
implementation — just check required fields are non-empty before "save".
On save: call `onSave(formData)` and close the dialog.
In mock mode `onSave` just adds/updates the local state in `AnnouncementsManager`.

**Dialog title:** "New Announcement" when creating, "Edit Announcement" when editing.
**Back button:** from step 2 back to step 1 (only when creating, not editing).

```tsx
interface AnnouncementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialAnnouncement?: Announcement | null
  onSave: (data: Partial<Announcement>) => void
}
```

---

## Admin: `CustomerHomepageManager`

**File:** `components/admin/customer-homepage-manager.tsx`
**Type:** Client Component

```tsx
interface CustomerHomepageManagerProps {
  customerId: string
  customerName: string
}
```

For mock mode this is a static layout — no real data needed.

**Layout:**

```
DEALS
  Active pallet deals visible to all customers:
  [deal title · $89.99 · Save $12]    [Hide for this customer]

  Pinned deal for this customer only:
  [+ Pin a specific deal]

ANNOUNCEMENTS
  Showing to this customer (tag match or all):
  [read-only list rows]

  Created just for this customer:
  [list rows with Edit/Delete]
  [+ Add announcement for this customer]
```

In mock mode, populate both sections with hardcoded placeholder items.
Add `// TODO: replace with real data` comments on both.

The "Add announcement for this customer" button opens `AnnouncementDialog`
with audience pre-filled.

---

## Admin page: `/admin/announcements`

**File:** `app/(admin)/admin/announcements/page.tsx`
**Type:** RSC

```tsx
import { requirePageAuth } from '@/lib/server/page-auth'
import { AnnouncementsManager } from '@/components/admin/announcements-manager'
// import { PageHeader } from '@/components/ui/page-header'  ← check exact import

export default async function AnnouncementsPage() {
  await requirePageAuth(['salesman'])

  // Mock data for design phase
  const MOCK_ANNOUNCEMENTS: Announcement[] = [
    {
      id: '1', content_type: 'text',
      title: 'May Promotion',
      body: 'Free delivery on orders over $200.',
      cta_label: 'Learn more', cta_url: '#',
      image_url: null, product_id: null, product_ids: [],
      badge_overrides: {}, audience_tags: [],
      starts_at: null, ends_at: null,
      is_active: true, sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2', content_type: 'image',
      title: 'Summer Launch 2026',
      body: null,
      cta_label: 'Shop now', cta_url: '#',
      image_url: 'https://placehold.co/600x200',
      product_id: null, product_ids: [],
      badge_overrides: {}, audience_tags: [],
      starts_at: null, ends_at: null,
      is_active: true, sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header with New Announcement button in top-right */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Announcements</h1>
        {/* New button is wired inside AnnouncementsManager via prop */}
      </div>
      <AnnouncementsManager initialAnnouncements={MOCK_ANNOUNCEMENTS} />
    </div>
  )
}
```

Read the existing admin pages (e.g. `app/(admin)/admin/catalog/page.tsx`) to see how
they structure page headers and pass data to manager components. Follow that pattern.

---

## Admin page: `/admin/customers/[id]/homepage`

**File:** `app/(admin)/admin/customers/[id]/homepage/page.tsx`
**Type:** RSC

```tsx
export default async function CustomerHomepagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePageAuth(['salesman'])
  const { id } = await params

  // TODO: fetch real customer profile
  // For now mock
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {/* Breadcrumb: ← Customers / {id} / Homepage */}
        <a href="/admin/customers" className="hover:underline">Customers</a>
        <span>/</span>
        <span>Customer</span>
        <span>/</span>
        <span className="text-foreground font-medium">Homepage</span>
      </div>
      <CustomerHomepageManager
        customerId={id}
        customerName="Acme Deli"
      />
    </div>
  )
}
```

---

## Admin nav change

**File:** `components/admin/admin-nav.tsx`

Read the file first. It has `PRIMARY_LINKS` and `ADMIN_LINKS` (dropdown).
Add one entry to the dropdown list after `Reports`:

```ts
{ href: '/admin/announcements', label: 'Announcements',
  match: (p: string) => p.startsWith('/admin/announcements') },
```

Check the exact shape of existing entries and match it.

---

## What NOT to do

- Do not modify `lib/types.ts` — define `Announcement` locally in the component files
- Do not run or reference any database migrations
- Do not create or modify API routes
- Do not modify `lib/hooks/useAutoSavePortal.ts` or `lib/portal-order-save.ts` — use them as-is
- Do not modify `useCatalog.ts`
- Do not modify any existing portal components (StartOrderHero, DraftResumeStrip, etc.)
- Do not add Zod validation — this is the design phase
- Do not try to fetch real product data for `specials_grid` or `product` cards — use mock/placeholder

---

## Engineering handoff log (REQUIRED)

**You must create `docs/handoff/homepage-redesign.md` before you finish.**

This file is read by the backend engineer who wires up real data and migrations
after this design task ships. Every mock, TODO, placeholder, or no-op must appear
here — a missing entry means a silent broken feature in production.

Format each entry as:

```markdown
## <short title>

- **File:** `path/to/file.tsx` line ~N
- **What the UI does now:** <one sentence>
- **What needs to happen:** <one sentence>
- **Blocked on:** <migration / API route / type change — be specific>
```

At minimum the log must contain an entry for every occurrence of:

1. `MOCK_ANNOUNCEMENTS` — replaced by real DB query in the portal page RSC
2. `MOCK_STATS` — replaced by real account stats query
3. Mock data in `AnnouncementsPage` RSC — replaced by `db.query` for announcements
4. Mock data in `CustomerHomepagePage` RSC — replaced by customer + announcements query
5. `// TODO: wire up PATCH` in `AnnouncementsManager` (reorder + toggle)
6. `// TODO: replace with real data` in `CustomerHomepageManager`
7. Plain text `Input` for product ID fields in `AnnouncementDialog` — replaced by searchable select
8. `AnnouncementsManager` delete action — needs DELETE API route
9. `AnnouncementsManager` create/edit save — needs POST/PATCH API route
10. Any other `// TODO` comment you write

Add a **Summary table** at the top:

```markdown
| # | File | What to replace | Blocked on |
|---|------|----------------|-----------|
| 1 | portal/[token]/page.tsx | MOCK_ANNOUNCEMENTS | migration 202604250001 + GET /api/portal/announcements |
| 2 | portal/[token]/page.tsx | MOCK_STATS | stats query in RSC |
```

---

## Files to create or modify

```
MODIFY:
  app/(portal)/portal/[token]/page.tsx         (slot in AccountStatsCard + AnnouncementsStack)
  components/admin/admin-nav.tsx               (add Announcements link)

CREATE:
  components/portal/announcements-stack.tsx
  components/portal/announcement-card.tsx      (TextCard, ImageBannerCard, ImageTextCard,
                                                ProductSpotlightCard, SpecialsGridCard inside)
  components/portal/account-stats-card.tsx
  components/admin/announcements-manager.tsx
  components/admin/announcement-dialog.tsx
  components/admin/customer-homepage-manager.tsx
  app/(admin)/admin/announcements/page.tsx
  app/(admin)/admin/customers/[id]/homepage/page.tsx
  docs/handoff/homepage-redesign.md            ← REQUIRED
```

---

## Verification checklist

After implementation:

1. `npm run typecheck` — zero errors
2. `npm run lint` — zero errors
3. Portal homepage loads — AccountStatsCard appears after DraftResumeStrip
4. AnnouncementsStack renders below stats with mock cards
5. TextCard shows title, body, CTA link
6. ImageBannerCard shows image with gradient overlay + title + CTA on the overlay
7. ImageTextCard is stacked on mobile (`flex-col`), side-by-side on desktop (`md:flex-row`)
8. ProductSpotlightCard renders with amber border; shows placeholder when product is null
9. SpecialsGridCard renders amber-accented grid; shows placeholder tiles when products is []
10. AccountStatsCard renders `null` when all stats are 0
11. All announcement cards are capped at 600px wide on desktop (stack container enforces it)
12. Admin nav has "Announcements" link in the dropdown
13. `/admin/announcements` loads with AnnouncementsManager showing mock announcements
14. "New Announcement" opens AnnouncementDialog step 1 (type picker)
15. Selecting a type in step 1 advances to step 2 (fields)
16. "Back" in step 2 returns to step 1 (creating only)
17. `/admin/customers/[id]/homepage` loads with CustomerHomepageManager
18. Reorder arrows in AnnouncementsManager update local sort order
19. Active toggle in AnnouncementsManager updates local is_active state
20. `docs/handoff/homepage-redesign.md` exists with summary table and one entry
    per mock/TODO in the implementation
