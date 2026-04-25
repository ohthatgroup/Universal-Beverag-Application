# Homepage and Navbar Redesign — Design Spec

**Status:** draft for sign-off
**Date:** 2026-04-25
**Builds on:** [`docs/design-system.md`](../../design-system.md), [`docs/superpowers/specs/2026-04-25-surface-system-rebuild-design.md`](./2026-04-25-surface-system-rebuild-design.md)
**Replaces (in part):** [`docs/agent-briefs/homepage-redesign-brief.md`](../../agent-briefs/homepage-redesign-brief.md) (the brief's content zone proposal stays; its design-system rules section is now this spec's)

## Context

The customer-portal homepage at [`app/(portal)/portal/[token]/page.tsx`](../../../app/(portal)/portal/[token]/page.tsx) is a thin RSC that renders five components in a vertical stack: `PortalPageHeader` (greeting), `StartOrderHero` (date picker + New Order button), `DraftResumeStrip` (inline draft chips), `OrdersList` (upcoming & recent), and `PastOrdersSection` (collapsed history). The page predates the portal-design doctrine and the surface-system rebuild. It works, but reads as a list of boxes with inconsistent rhythm — there's no editorial spine, no quick-glance status, no visible relationship between what the customer ordered last week and what they should order this week.

The navbar at [`components/layout/portal-top-bar.tsx`](../../../components/layout/portal-top-bar.tsx) is 31 lines: an `h-12` `border-b bg-background` row containing a muted-text brand link on the left and a UserCircle icon button on the right. It accepts a `customerName` prop that's never rendered (flagged in the engineering handoff as cleanup). It works, but it's so minimal that on the homepage there's nothing distinguishing one page from another — every portal page reads as the same chrome plus different content.

We're redesigning both at once because they're chrome-and-content for the same surface. Touching one without the other would look inconsistent. This spec lands ahead of the implementation chat so the design choices are made before code is written.

## Goals

1. **Homepage that opens with the customer's "next order" front and center**, not behind a date picker. The first thing you see should answer "what am I doing here?" in one glance.
2. **Visible past-week activity** — what was ordered, what was delivered, what's outstanding — without scrolling.
3. **Clear path to the order page** — the primary CTA (Start Order / Continue Draft) is the single accent element on the homepage.
4. **Navbar that gives the homepage a sense of place** without becoming a competing surface. Doctrine Rule 10 still holds: only one sticky surface at a time.
5. **Consistent z-index, layout, and surface relationship across pages** so that the cart bar (when it appears on the order builder) doesn't fight the navbar.

## Non-goals

- No changes to admin pages.
- No changes to authentication, the magic-link flow, or `resolveCustomerToken`.
- No new routes — the homepage stays at `/portal/[token]`.
- No new components beyond what this spec calls out.
- No changes to the navbar on the order builder beyond what naturally follows from the new shape.

## The redesign — Homepage

### Layout (post-rebuild)

```
┌────────────────────────────────────────┐ ← <PortalTopBar> (redesigned, see Navbar below)
│                                        │
├────────────────────────────────────────┤
│                                        │
│  Good morning, Maya 👋                 │ ← <PortalPageHeader> (greeting, lighter weight)
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Order for Thursday, May 1        │ │ ← <NextOrderCard> (NEW; primary CTA)
│  │                                  │ │
│  │ Last delivery: 3 days ago        │ │
│  │ 18 items · $402.50               │ │
│  │                                  │ │
│  │  [Continue draft →]   or         │ │
│  │  [Start new order →]             │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Recent activity                       │ ← <RecentActivity> section (NEW grouping)
│  ─────────────────────────────────     │
│  • Apr 25 · Delivered · 24 items       │
│  • Apr 22 · Submitted · 18 items       │
│  • Apr 18 · Delivered · 32 items       │
│  [See all orders →]                    │
│                                        │
└────────────────────────────────────────┘
```

### Component map

The homepage page (`app/(portal)/portal/[token]/page.tsx`) renders, in order:

1. **`<PortalTopBar>`** — rendered by the layout, not the page. See Navbar section.
2. **`<PortalPageHeader>`** — greeting only. Drop the back-arrow on the homepage (there's nowhere to go back to).
3. **`<NextOrderCard>`** (new) — the load-bearing CTA. Subsumes `<StartOrderHero>` + `<DraftResumeStrip>`'s primary draft. See below.
4. **`<RecentActivity>`** (new) — replaces the separate `<OrdersList>` (current) + `<PastOrdersSection>` (past). One condensed list with status chips, capped at ~5 rows, with a "See all orders" link. See below.

`<StartOrderHero>`, `<DraftResumeStrip>`, `<OrdersList>` (on the homepage), `<PastOrdersSection>` are deleted from the homepage. They may still be used in `/portal/[token]/orders` (the dedicated history page); confirm during implementation. If `<DraftResumeStrip>` has no other consumers, delete it entirely.

### `<NextOrderCard>` shape

```tsx
<div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
  <div className="space-y-0.5">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      Order for
    </div>
    <h2 className="text-h1 font-semibold">
      {formatDeliveryDate(nextDeliveryDate)}
    </h2>
  </div>

  {hasMostRecentDelivery && (
    <div className="text-sm text-muted-foreground">
      Last delivery {timeSince(lastDelivery.date)} · {lastDelivery.itemCount} items · {formatCurrency(lastDelivery.total)}
    </div>
  )}

  <div className="flex flex-col gap-2 pt-2">
    {hasDraft ? (
      <Button variant="accent" size="lg" asChild>
        <Link href={draftHref}>Continue draft <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
      </Button>
    ) : (
      <Button variant="accent" size="lg" asChild>
        <Link href={newOrderHref}>Start new order <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
      </Button>
    )}
    {hasDraft && (
      <Button variant="outline" asChild>
        <Link href={newOrderHref}>Or start new order for a different date</Link>
      </Button>
    )}
  </div>
</div>
```

Doctrine compliance:
- `rounded-xl` (Rule 5).
- Single `accent` button per region (Rule 6).
- Hover signals via Button's built-in styles (Rule 8).
- No glass treatment — the homepage isn't a floating surface (Rule 2).

### `<RecentActivity>` shape

A condensed, status-aware list. Uses existing `<StatusChip>` primitive.

```tsx
<section className="space-y-3">
  <div className="flex items-baseline justify-between">
    <h2 className="text-h2 font-semibold">Recent activity</h2>
    <Link href={`${basePath}/orders`} className="text-sm text-muted-foreground hover:text-foreground">
      See all
    </Link>
  </div>

  {activity.length > 0 ? (
    <ul className="divide-y rounded-xl border bg-card">
      {activity.slice(0, 5).map((order) => (
        <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">
              {formatDeliveryDate(order.delivery_date)}
            </div>
            <div className="text-xs text-muted-foreground">
              {order.item_count} items · {formatCurrency(order.total)}
            </div>
          </div>
          <StatusChip status={order.status} />
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState
      title="No orders yet"
      description="Your recent orders will appear here."
    />
  )}
</section>
```

Doctrine compliance:
- `rounded-xl` container (Rule 5).
- `divide-y` for row separation — no per-row borders (Rule 5 spirit).
- StatusChip is the existing primitive (no per-instance styling).

### Data queries

The page already runs two parallel queries (drafts + all orders). One small change:

- Add a `lastDeliveryQuery` that fetches the most-recent `delivered` order's date / item_count / total. Used by `<NextOrderCard>` to render the "Last delivery 3 days ago · X items" line.
- Cap the homepage's orders fetch to 10 most-recent (currently fetches all). The `/portal/[token]/orders` page does the full fetch.

### Cart bar on the homepage

`<CartReviewSurface>` is **not rendered on the homepage**. It only renders on the order builder where there's an active order context. The homepage is fixed-bottom-clear; no `pb-28` needed on this page's root.

If the customer has a draft and the doctrine wants to show a sticky "Continue draft" affordance, it lives inside `<NextOrderCard>` (which is part of the scroll content, not fixed) — not as a duplicate floating bar.

### Desktop content cap

The portal layout already constrains content to `max-w-3xl`. The `<NextOrderCard>` and `<RecentActivity>` look fine at 768px. **No homepage-specific cap.** (The homepage-redesign-brief proposed a 600px cap for the announcement zone — we're not building that announcement zone in this redesign; it's deferred.)

## The redesign — Navbar

### Layout (post-rebuild)

The navbar stays minimal but gains intentional shape. Three states:

**Homepage** (`/portal/[token]`):

```
┌────────────────────────────────────────┐
│ Universal Beverages          [👤]     │
└────────────────────────────────────────┘
```

Brand text on the left (clickable, but already on home — re-renders the page). Account icon on the right. Same as today, just with refined typography (see Doctrine Rule 12 wording below).

**Subpage** (`/portal/[token]/order/...`, `/portal/[token]/orders`, `/portal/[token]/account`):

```
┌────────────────────────────────────────┐
│ ←  {Page title}              [👤]     │
└────────────────────────────────────────┘
```

Back-arrow on the left. The back-arrow returns to `/portal/[token]` always (not browser-back) — the portal isn't a deep stack; one level back is always home. The page title is mid-weight, replacing the brand link (avoids two competing labels).

This is a navbar-level back-arrow, not the in-content `<PortalPageHeader>` back-arrow. The `<PortalPageHeader>` becomes a content-level header (the day's delivery date on the order page; the orders-list page title on `/orders`; etc.) without a duplicate back affordance.

### Behavior

- **Static, not sticky.** `border-b bg-background` with no `position: fixed`. Per Rule 10, the cart bar is the only sticky surface on the order builder. The navbar scrolls with the page. The reduced visual chrome on scroll is acceptable; the topbar is an entry-point affordance, not a persistent control.
- **`h-12` height** (unchanged).
- **`max-w-3xl mx-auto` inner container** so it aligns with the page content column.
- **Account icon** uses `<Button variant="ghost" size="icon">` with `aria-label="Account"`. Tapping navigates to `/portal/[token]/account`.
- **Brand text vs page title** — homepage uses `text-sm font-medium text-muted-foreground` brand link; subpages replace it with `text-sm font-medium text-foreground` page title (no link). The page title is determined by the route, NOT by a prop passed from each page (avoids prop drilling).

### Z-index relationship with `<CartReviewSurface>`

- Navbar: no z-index assignment (default stacking, scrolls with page).
- Cart bar (closed): `fixed bottom-0 z-30`.
- Review drawer (open): `fixed bottom-0 z-50` (Radix Dialog Content).
- Page content: default.

Because the navbar isn't `fixed`, there's no z-fight. When the review drawer opens and dims the page with its overlay (z-40), the navbar dims along with the content. That's intended.

### Account icon convention

The UserCircle icon is the only persistent navbar affordance. Doctrine convention:
- No badge/dot indicators on the icon (the homepage's `<NextOrderCard>` carries the actionable state).
- No dropdown menu — tapping navigates to the account page.
- Aria-label "Account."

## Doctrine additions (to be lifted into design-system.md after the implementation lands)

### Proposed Rule 12 (already in design-system.md)

> **12. Navbar is page chrome, not a competing surface.** The `<PortalTopBar>` (`components/layout/portal-top-bar.tsx`) is part of the static page above the scroll content — `border-b bg-background`, no `fixed` positioning, no glass treatment. It does not compete with `<CartReviewSurface>` for sticky-surface attention (Rule 10). Account icon is the only persistent affordance; brand link demotes to muted text. A back-arrow lives in the topbar on subpages and returns to `/portal/[token]` (one level up, always). Anti-pattern: a sticky topbar layered over the cart bar; account dropdowns or search bars in the topbar; primary CTAs in the topbar.

(The Rule 12 text in `docs/design-system.md` mentions back-arrow in `<PortalPageHeader>` instead of the topbar. After implementation lands, update Rule 12 in design-system.md to match what shipped — exact location of the back-arrow is the implementation chat's call.)

### Proposed Page-level layouts section (already in design-system.md)

The Page-level layouts section already in `docs/design-system.md` covers the body padding / max-w-3xl alignment / CartReviewSurface-only-on-order-builder decisions. No additions needed.

## Code-change list

### Modify

| Path | Change |
|---|---|
| `app/(portal)/portal/[token]/page.tsx` | Replace the existing 5-component vertical stack with `<PortalPageHeader>` (greeting only, no back arrow) + `<NextOrderCard>` + `<RecentActivity>`. Delete `<StartOrderHero>` / `<DraftResumeStrip>` / `<OrdersList>` / `<PastOrdersSection>` invocations from this page. Adjust queries to add `lastDeliveryQuery`. |
| `components/layout/portal-top-bar.tsx` | Add a `currentPath` (or `mode: 'home' \| 'subpage'`) prop. When subpage, render a back-arrow + page title instead of the brand link. Drop the unused `customerName` prop. |
| `app/(portal)/portal/[token]/layout.tsx` | Pass the route segment / page title hint into `<PortalTopBar>` so it can render the right state. (Mechanism is the implementation chat's call — could be `usePathname` in a client component, or a server-side segment-aware prop.) |
| `components/portal/portal-page-header.tsx` | Drop the back-arrow from this component on the homepage (or accept a `showBack` prop and have the homepage pass `showBack={false}`). |

### Create

| Path | What |
|---|---|
| `components/portal/next-order-card.tsx` | The new primary CTA card. Props: `nextDeliveryDate`, `lastDelivery: { date, itemCount, total } \| null`, `draft: { orderId, deliveryDate } \| null`, `token`. |
| `components/portal/recent-activity.tsx` | The condensed activity list. Props: `orders: Order[]`, `token`, `showPrices`. Caps at 5 rows. Renders `<StatusChip>` per row. Renders `<EmptyState>` if `orders.length === 0`. |

### Delete (verify no other consumers first)

| Path | Reason |
|---|---|
| `components/portal/start-order-hero.tsx` | Subsumed by `<NextOrderCard>`. |
| `components/portal/draft-resume-strip.tsx` | Subsumed by `<NextOrderCard>`. |
| `components/portal/past-orders-section.tsx` | Subsumed by `<RecentActivity>` (with the dedicated `/orders` page handling deep history). |

(Confirm during implementation that `<OrdersList>` is still used on `/portal/[token]/orders` before removing it from anywhere.)

## Verification

### Static checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

All four must pass. Pre-existing warnings unrelated to this work are acceptable.

### Touch checklist (mobile + desktop)

- [ ] Homepage opens to a clear "next order" CTA at the top — the page answers "what am I doing here?" in one glance.
- [ ] If the customer has a draft for the next delivery date, the primary button reads "Continue draft" (accent). If not, it reads "Start new order" (accent).
- [ ] The `<NextOrderCard>` shows the most-recent delivery's date / item count / total (when applicable).
- [ ] `<RecentActivity>` shows up to 5 recent orders with status chips. Tapping "See all" navigates to `/portal/[token]/orders`.
- [ ] On the homepage, the navbar shows brand text + account icon. No back-arrow.
- [ ] On a subpage (e.g. order builder), the navbar shows back-arrow + page title + account icon. Tapping the back-arrow returns to the homepage (not browser-back).
- [ ] The navbar is NOT sticky. It scrolls with the page.
- [ ] On the order builder, `<CartReviewSurface>` (closed state, the cart bar) is the only fixed-bottom surface. The navbar doesn't fight it.
- [ ] On the homepage, no cart bar appears (the homepage doesn't render `<CartReviewSurface>`).
- [ ] The `<NextOrderCard>` accent CTA hovers correctly (focus ring visible) and is the only accent-tinted affordance in its visible region.
- [ ] On desktop, the homepage content fits within `max-w-3xl mx-auto`. The `<NextOrderCard>` looks intentional at 768px+.

### Doctrine cross-check

- [ ] Rule 1 (one figure per screen): The `<NextOrderCard>` is the figure on the homepage. `<RecentActivity>` is supporting context, not a competing region.
- [ ] Rule 5 (corner radii): Only `rounded-xl` on cards / containers; only `rounded-full` on pill controls.
- [ ] Rule 6 (accent reserved for committing): Exactly one accent button visible per region. The homepage has one. The navbar has zero.
- [ ] Rule 8 (hover/focus): Every clickable element on the homepage signals hover.
- [ ] Rule 10 (one sticky surface): On the homepage, none. On the order builder, only the cart bar. Navbar is static everywhere.
- [ ] Rule 12 (navbar): Static, not sticky. Account icon only. Back-arrow on subpages returns to home.

## Risks and mitigations

- **The back-arrow on the navbar duplicates browser back-button behavior.** Mitigation: it's intentional — most customers come in via magic link and won't have a meaningful browser history. The in-app back-arrow gives them a reliable way home.
- **Deleting `<StartOrderHero>` / `<DraftResumeStrip>` / `<PastOrdersSection>` could break other pages that use them.** Mitigation: grep for consumers before deletion. If the `/orders` page uses any of them, leave them in place and only remove from the homepage.
- **`<NextOrderCard>` shows "Last delivery N days ago" — if the customer has never had a delivery, that line should hide gracefully.** Mitigation: render the line only when `lastDelivery` is non-null; the card still works without it.
- **The route-aware navbar (knows which page it's on) could become a tangle.** Mitigation: a single `usePathname()` call in a client-component PortalTopBar is cleanest. If we go server-side (passing path from layout), keep the prop signature minimal — `currentPath: string` or `mode: 'home' | 'subpage'`, not a hash of every possible state.
- **The "See all orders" link on `<RecentActivity>` points at `/portal/[token]/orders`.** Confirm that route still renders the full history; if it was inadvertently broken in the rebuild, fix it in the same PR.

## Out of scope

- The announcement zone proposed in `docs/agent-briefs/homepage-redesign-brief.md` (admin-curated content cards). Defer to a follow-up.
- The `AccountStatsCard` proposed in the homepage brief. Defer.
- Any change to the `/portal/[token]/orders` history page. It stays as-is.
- Any change to the order builder beyond what naturally follows from the navbar shape change.
- Push notifications, email reminders, or any growth-loop wiring.

## Plan format (next step)

Once approved, the implementation plan will follow the same pattern as the surface-system rebuild and the doctrine pass: numbered tasks with full code blocks, each one a self-contained commit. Estimated 6–9 tasks across:

1. Build `<NextOrderCard>` (pure presentational, no data wiring yet).
2. Build `<RecentActivity>` (pure presentational).
3. Refactor `<PortalTopBar>` to support home + subpage modes.
4. Update `app/(portal)/portal/[token]/layout.tsx` to pass route info to `<PortalTopBar>`.
5. Update `<PortalPageHeader>` to optionally hide the back-arrow.
6. Rewrite `app/(portal)/portal/[token]/page.tsx` to use `<NextOrderCard>` + `<RecentActivity>`; add `lastDeliveryQuery`.
7. Delete `<StartOrderHero>`, `<DraftResumeStrip>`, `<PastOrdersSection>` (after grep).
8. Update `docs/design-system.md` Rule 12 wording to match shipped (exact back-arrow location).
9. Final verification + Workers deploy.

That's the plan when you say go.
