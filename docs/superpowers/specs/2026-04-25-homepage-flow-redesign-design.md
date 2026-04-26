# Homepage flow redesign — Design Spec

**Status:** approved during conversation, going straight to implementation
**Date:** 2026-04-25
**Builds on:** [`docs/superpowers/specs/2026-04-25-homepage-and-navbar-design.md`](./2026-04-25-homepage-and-navbar-design.md), [`docs/design-system.md`](../../design-system.md), [`docs/archive/st-9-portal-design-theory.md`](../../archive/st-9-portal-design-theory.md)

## Why

The previous spec slotted `AccountStatsCard` + `AnnouncementsStack` between `DraftResumeStrip` and `OrdersList`, but kept the existing top-of-page order (`PortalPageHeader → StartOrderHero → DraftResumeStrip → ...`) as a fixed constraint.

That order is wrong for the actual user. The portal is a **recurring operational tool for store operators** (founding theory, Doctrine Rule 1) — they're reordering, not shopping. The hero is currently a date picker + "Start order" CTA, which assumes every visit is a *new* ordering session. In reality, the dominant flows are:

1. **Resume an in-flight draft.**
2. **Reorder last week's order.**
3. **Apply usuals to a fresh draft.**

The current design buries (1) in a strip, makes (2) require scrolling to "Upcoming & recent" then tapping into an order, and offers no path for (3). That's the problem.

Separately, the homepage is also where the salesman markets to the customer (announcements, deals, featured products). That's the second pillar — a "For You" feed below the fold.

This redesign repositions the homepage as **two pillars**: above the fold = start-order surface (with the three paths visible); below the fold = FYP feed.

## Goals

1. Replace `<StartOrderHero>` + `<DraftResumeStrip>` with one `<StartOrderFork>` component that owns above-the-fold logic.
2. Surface three start-order paths visibly: **Reorder last order** (primary), **Order your usuals** (secondary), **Start from scratch** (tertiary).
3. When a draft exists for the next-available delivery date, hoist it as the figure (`Resume draft` accent button) and demote the fork below it with a "or start a new order" divider; the fork's date silently advances to the next-next delivery date.
4. Progressive reveal: brand-new customers see only "Start order" (no fork). Reorder appears after order #1. Usuals appears after order #3.
5. All three paths default to the next-available delivery date (per Doctrine: "the next-available date as a button, not a picker"). A small "Change date" link opens the picker.
6. Demote the AccountStatsCard to the bottom of the page (it's reference, not action).
7. Frame the AnnouncementsStack as a "For You" feed.

## Non-goals

- No backend wiring: the "last order" data, "usuals" derivation, and clone/replace mutations are all mocked. See `docs/handoff/homepage-redesign.md` for the follow-up list.
- No changes to the order builder, account, or admin surfaces.
- No new visual primitives — every element composes existing components (`<Button>`, `<StatusChip>`, `<Money>`).
- No Zod validation; no API routes.
- No changes to the announcement card variants themselves — they stay as-is from the previous spec.

## Above-the-fold — `<StartOrderFork>`

### State machine

```
                   ┌─ no submitted orders ─────► "Start order →" only
                   │
                   ├─ 1 submitted order ───────► Reorder + Scratch
                   │
                   ├─ 2 submitted orders ──────► Reorder + Scratch
                   │
                   └─ ≥3 submitted orders ─────► Reorder + Usuals + Scratch

                   ─ if draft exists for next delivery date ─
                       ► hoist "Resume draft" as figure;
                         the fork below uses next-next date
```

### Layout — draft exists

```
┌──────────────────────────────────────────────┐
│ Maya — Corner Deli                           │ ← PortalPageHeader (existing)
│                                              │
│ ╔══════════════════════════════════════════╗ │
│ ║  ●  Resume draft for Thu, May 1          ║ │ ← Resume block
│ ║     4 items · last edited 2h ago      →  ║ │   variant=accent, full row
│ ╚══════════════════════════════════════════╝ │   bg-accent text-accent-foreground
│                                              │
│ ── or start a new order ────────────         │ ← muted divider label
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  ↻ Reorder Apr 18 (24 items)      →  │   │ ← Path 1: Reorder
│  └──────────────────────────────────────┘   │   variant=outline, accent border
│  ┌──────────────────────────────────────┐   │
│  │  ★ Order your usuals              →  │   │ ← Path 2: Usuals (≥3 orders)
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │    Start from scratch             →  │   │ ← Path 3: Scratch
│  └──────────────────────────────────────┘   │
│                                              │
│  for delivery May 8 · [Change date]          │ ← shared next-next date label
└──────────────────────────────────────────────┘
```

### Layout — no draft

```
┌──────────────────────────────────────────────┐
│ Maya — Corner Deli                           │
│                                              │
│ Order for Thu, May 1 · [Change date]         │ ← inline date label, demoted
│                                              │
│ ╔══════════════════════════════════════════╗ │
│ ║  ↻ Reorder Apr 18 (24 items)         →   ║ │ ← Reorder is the figure
│ ╚══════════════════════════════════════════╝ │   variant=accent
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  ★ Order your usuals              →  │   │ ← Usuals (≥3 orders only)
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │    Start from scratch             →  │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Layout — brand-new customer

```
┌──────────────────────────────────────────────┐
│ Maya — Corner Deli                           │
│                                              │
│ Order for Thu, May 1 · [Change date]         │
│                                              │
│ ╔══════════════════════════════════════════╗ │
│ ║  Start order                          →  ║ │ ← only path
│ ╚══════════════════════════════════════════╝ │
└──────────────────────────────────────────────┘
```

### Confirm-replace dialog (uniform across all three paths)

When a customer taps a path while a draft exists at the target date, show:

```
╔════════════════════════════════════════════╗ ← <Panel variant="centered">
║  Replace your draft?                  [×]  ║
║  ────────────────────────────────────────  ║
║                                            ║
║  You have a draft for May 1 with 4 items.  ║
║                                            ║
║  Replacing it with [last week's order /    ║
║  your usuals / a fresh draft] will         ║
║  discard your in-flight changes.           ║
║                                            ║
║                          [Cancel] [Replace]║
╚════════════════════════════════════════════╝
```

`[Replace]` is `variant="destructive"`. Cancel closes the dialog with no state change.

In mock mode the path-tap fires a placeholder `window.alert` describing what would happen — backend wiring is a follow-up task per the handoff.

## Below-the-fold — sections in order

```
┌──────────────────────────────────────────────┐
│   ── For you ───────────────────────────     │ ← muted section heading
│                                              │
│   <AnnouncementsStack> — 600px max, the      │
│   five card variants in sort order           │
│                                              │
│   ── Recent orders ─────────────────────     │ ← OrdersList moves here
│   Apr 28 · Submitted · 24 items     →       │   (no longer above the fold)
│   Apr 25 · Delivered · 18 items     →       │
│                                              │
│   ── Past orders ───────────────────────     │ ← PastOrdersSection unchanged
│   [collapsed list, expandable]               │
│                                              │
│   ── Account ───────────────────────────     │ ← AccountStatsCard moved here
│   April 2026 · 48 cases · $1,240 · 3 ord     │   reference, not action
└──────────────────────────────────────────────┘
```

The "Recent orders" section keeps its existing `<OrdersList variant="current">` rendering. The label changes from "Upcoming & recent" → "Recent orders" since reorder-from-here is no longer the primary affordance (the StartOrderFork's Reorder button covers that case).

## Component contract — `<StartOrderFork>`

```tsx
interface StartOrderForkProps {
  token: string
  /**
   * Customer's next-available delivery date (today or future, per
   * cutoff rules). The fork's default target date.
   */
  nextDeliveryDate: string
  /**
   * If non-null, the customer has an in-flight draft on or after
   * `nextDeliveryDate`. Render the resume block + advance the fork
   * to the *next-next* delivery date.
   */
  primaryDraft: {
    id: string
    deliveryDate: string
    itemCount: number
    updatedAt: string
  } | null
  /** Total submitted+delivered orders (drives progressive reveal). */
  submittedOrderCount: number
  /**
   * The most recent submitted/delivered order. Powers "Reorder Apr 18 (24 items)".
   * Null when `submittedOrderCount === 0`.
   */
  lastOrder: {
    id: string
    deliveryDate: string
    itemCount: number
  } | null
  /**
   * The next-next-available delivery date — used as the fork's
   * default when a draft already occupies `nextDeliveryDate`.
   */
  nextNextDeliveryDate: string
}
```

The component is a **client component** because the date picker, the confirm-replace dialog, and the path tap handlers all need React state.

### Internal structure

```
<StartOrderFork>
  <DraftResumeBlock /> ← only when primaryDraft != null
  <ForkDateLabel />    ← either "or start a new order" + date, or just date
  <PathRow icon=↻ label="Reorder Apr 18 (24 items)" variant=accent|outline />
  <PathRow icon=★ label="Order your usuals" />            ← only when count >= 3
  <PathRow label="Start from scratch" />
  <ConfirmReplaceDialog />
</StartOrderFork>
```

`<PathRow>` is local to the file (not exported). Each row is a `<Button>` with `variant=outline` (or `variant=accent` for the figure case), `size=lg`, `w-full`, with an icon glyph + label + chevron. Despite the doctrine's general prohibition against `w-full`, full-width buttons are appropriate here because each path is its own row in a stacked decision list — the same exception that applies to the bottom-sheet action rows (Doctrine Rule on Buttons, exception 1).

### Variant assignment (which path is "the figure")

| State | Figure | Ground |
|---|---|---|
| Draft exists | DraftResumeBlock | All three paths (outline) |
| No draft, history | Reorder (accent, large) | Usuals + Scratch (outline) |
| Brand-new customer | Single "Start order" (accent) | — |

Doctrine Rule 6 ("at most one accent affordance per visible region") is satisfied: when the resume block is the figure, the three paths below it are all neutral outlines; when Reorder is the figure, Usuals + Scratch are outlines.

## Code-change list

### Modify

| Path | Change |
|---|---|
| `app/(portal)/portal/[token]/page.tsx` | Restructure: replace `<StartOrderHero>` + `<DraftResumeStrip>` with `<StartOrderFork>`. Compute `submittedOrderCount`, `lastOrder`, `nextNextDeliveryDate`. Move `<AccountStatsCard>` to the bottom. Reorder sections: PageHeader → StartOrderFork → "For you" + AnnouncementsStack → "Recent orders" + OrdersList → PastOrdersSection → AccountStatsCard. |

### Create

| Path | What |
|---|---|
| `components/portal/start-order-fork.tsx` | The new client component described above. Owns DraftResumeBlock + path rows + ConfirmReplaceDialog. |

### Keep but unused on this page

`<StartOrderHero>` and `<DraftResumeStrip>` are no longer rendered by the homepage. They remain in the codebase (for now) — they're imported nowhere else either, but deleting them is a separate cleanup commit so this redesign stays scoped.

## Doctrine compliance

- **Rule 1 (object-first, one figure per screen):** the page now has exactly one figure above the fold — either the draft resume block or the Reorder button. The other paths are ground.
- **Rule 6 (one accent per region):** see Variant assignment above.
- **Rule 8 (hover/focus):** all interactive elements use `<Button>` which handles hover/focus.
- **Rule 9 (panel variants):** ConfirmReplaceDialog uses `<Panel variant="centered">`.
- **Rule 10 (one sticky surface):** no new fixed-position elements introduced.
- **Rule 11 (autosave or commit):** the order builder still autosaves; this page commits each path tap explicitly via the confirm-replace flow when a draft conflict exists.

## Mock data shape (page-level)

The portal homepage RSC computes:

```ts
const submittedOrderCount = ordersResult.rows.filter(
  o => o.status === 'submitted' || o.status === 'delivered'
).length

const lastOrder = ordersResult.rows.find(
  o => o.status === 'submitted' || o.status === 'delivered'
) ?? null
// Mocked when count is 0; real query already returns this row in `ordersResult`.

const nextNextDeliveryDate = computeNextNextDeliveryDate(nextDeliveryDate)
// Mock: just `nextDeliveryDate + 7 days` for now. Real cutoff logic
// (skip weekends, skip holidays) is a backend follow-up.
```

## Verification

### Static checks

`npm run typecheck && npm run lint && npm run build` all clean.

### Touch checklist

- [ ] Customer with **a draft for the next delivery date**: page shows accent "Resume draft" block + a divider + three outline paths below it. The fork's date label reads "for delivery [next-next date]."
- [ ] Customer with **no draft, ≥3 submitted orders**: page shows accent "Reorder Apr 18 (24 items)" as the figure, Usuals + Scratch as outline rows below.
- [ ] Customer with **no draft, 1–2 submitted orders**: same as above but Usuals is hidden.
- [ ] Customer with **no submitted orders**: page shows a single "Start order" accent button.
- [ ] All three path taps in mock mode fire a `window.alert` placeholder that describes what would happen ("Reorder last order Apr 18 — will create draft for May 1 with 24 items").
- [ ] AccountStatsCard renders at the bottom of the page (after PastOrdersSection).
- [ ] AnnouncementsStack section is preceded by a "For you" heading.
- [ ] OrdersList section is preceded by a "Recent orders" heading (changed from "Upcoming & recent").
- [ ] On mobile (375px), the three path rows are full-width stacked. On desktop, they are full-width inside the page column (`max-w-3xl`).

## Out of scope (handoff entries)

The handoff doc gets these new entries appended:

| # | File | What to replace | Blocked on |
|---|------|-----------------|------------|
| 11 | `app/(portal)/portal/[token]/page.tsx` | mocked `lastOrder` + `submittedOrderCount` + `nextNextDeliveryDate` | already-correct query in `ordersResult` for last order; cutoff-aware next-next-date utility |
| 12 | `components/portal/start-order-fork.tsx` | path-tap handlers fire `window.alert` | `clone_order(source_order_id, new_delivery_date)` for Reorder; "compute usuals" SQL helper for Usuals; existing draft-create endpoint for Scratch |
| 13 | `components/portal/start-order-fork.tsx` | confirm-replace dialog wiring (does not actually replace) | `submit_order` / `delete_order_items` + `clone_order` to swap a draft's contents |

## Iteration 2 (post-review feedback)

After the first build, the customer flagged three issues during a live
preview review:

1. **"Above the fold feels incomplete"** — three big buttons floating in
   white space read as sparse. The Resume Draft block is rich (date,
   item count); the path rows below it are bare labels.
2. **"Jarring on desktop"** — the page column was `max-w-3xl` (768px)
   while the FYP feed was `max-w-[600px]`, with both centered. As you
   scrolled the content shifted inward at the FYP boundary.
3. **"Need a list of previous orders I can reorder from with a preview
   button"** — the single "Reorder last order" button only handled the
   most-recent case. Customers want to pick a specific historical order
   (the big monthly stocking order vs. last week's small fill-in) and
   peek at its line items before committing.

The iteration:

- Replaces the single Reorder `<PathRow>` with a new `<ReorderList>`
  that shows the most-recent 3 orders by default with "Show n more"
  expansion (top 5 from the RSC). Each row carries date, item count,
  total, an eye-icon Preview affordance, and a Reorder button. The
  topmost row is amber-tinted (figure); subsequent rows are plain
  borders (ground).
- Adds `<OrderPreviewSheet>`, a `<Panel variant="bottom-sheet">` that
  shows the order's line items as a read-only list (product name +
  pack label + qty + line total) with a full-width accent
  "Reorder these items" CTA in the footer. In mock mode the items are
  hardcoded archetypes; real wiring is handoff entry 13a.
- Wraps the entire homepage stack in `max-w-[600px] mx-auto` so the
  whole page is one editorial column on desktop. The FYP and AccountStats
  components keep their internal max-widths as harmless defaults so they
  remain self-contained if reused elsewhere.
- Path rows (`Order your usuals`, `Start from scratch`) are now
  `w-full` on mobile but `sm:w-auto sm:justify-start` on desktop so
  they no longer stretch to fill the column. They size to content like
  Doctrine Rule for buttons specifies.
- The Reorder action confirms by dropping the customer into the order
  builder pre-loaded with the cloned items (so they always tweak before
  submitting). In mock mode the path-handler `window.alert` describes
  this, including which source order is being cloned.

### Updated component contract — `<StartOrderFork>`

```tsx
interface StartOrderForkProps {
  token: string
  nextDeliveryDate: string
  nextNextDeliveryDate: string
  primaryDraft: { id, deliveryDate, itemCount, updatedAt } | null
  submittedOrderCount: number
  /** Top 5 most-recent submitted/delivered orders, newest first. */
  recentOrders: ReorderableOrder[]
}
```

The single `lastOrder` prop is replaced by `recentOrders[]`. `<ReorderList>`
slices to 3 by default and exposes a "Show more" expand.

### Updated layout

```
┌──────────────────────── max-w-[600px] mx-auto ──────────────────────┐
│ Page header (greeting)                                              │
│ Resume draft (if present, accent block)                             │
│ — or start a new order —                                            │
│ for delivery <date> · Change date                                   │
│                                                                      │
│ REORDER A RECENT ORDER                                              │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ ● Apr 25 · 24 items · $214.00              [👁] [Reorder]  │    │  ← row 0 amber-tinted
│ └─────────────────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ ● Apr 18 · 18 items · $164.00              [👁] [Reorder]  │    │  ← rows 1+ plain border
│ └─────────────────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ ● Apr 11 ·  9 items ·  $84.00              [👁] [Reorder]  │    │
│ └─────────────────────────────────────────────────────────────┘    │
│           Show 2 more ▾                                             │
│                                                                      │
│ OR                                                                  │
│ ┌──────────────────────────┐                                        │  ← desktop sm:w-auto
│ │ ★ Order your usuals    →│                                        │
│ └──────────────────────────┘                                        │
│ ┌──────────────────────────┐                                        │
│ │   Start from scratch   →│                                        │
│ └──────────────────────────┘                                        │
│                                                                      │
│ FOR YOU [announcements feed]                                        │
│ RECENT ORDERS [OrdersList]                                          │
│ PAST ORDERS                                                         │
│ Account stats                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Iteration 3 (the welcome moment + zone separation)

After iteration 2 the structure was right but the page still didn't feel
like an *arrival*. Customer feedback:

> "Above the fold needs to be visually separated from below the fold.
> And we need to add a nice greeting and maybe today's date and time.
> Think like a designer first — you want to impress the customer when
> they enter."

The literal phrasing the customer suggested:

> *"Good Morning Maya — Today is Tuesday May 4 — It is 4:15 — what can
> we get for Maya Deli today?"*

That phrasing reads as one continuous welcome sentence. It splits
naturally into three layers, becoming a `<HomepageGreeting>` block:

```
Good morning, Maya
Today is Tuesday, May 4 · It's 4:15 PM

What can we get for Maya Deli today?
```

- Period-of-day greeting + first name (text-2xl, semibold).
- Quiet temporal context line (text-sm muted) — orients the customer
  before they make scheduling decisions.
- Lead-in question that uses the *business name* (because that's what
  they're ordering for) — this becomes the page asking the question
  that the start-order fork answers, so the fork no longer floats.

### Time-zone handling

The greeting reads the browser's local clock — server-side rendering
would lie about the customer's timezone (Cloudflare Workers runs UTC,
so a 7pm EST customer would see "Good morning"). `<HomepageGreeting>`
is therefore a client component. It hydrates with the user's local
time and updates every 60 seconds.

Pre-hydration the greeting renders "Hello" + omits the time line, so
the layout doesn't shift on hydration.

### Above-the-fold vs below-the-fold zones

The page now has two visually distinct surfaces:

- **Above the fold** — page background. The welcome moment + start-order
  surface. Operational, customer-driven.
- **Below the fold** — `border-t border-foreground/5 bg-muted/30`. The
  curated content + history + reference data. Salesman-driven and
  reference.

This satisfies the "separate the two pillars" feedback without an
explicit divider line — the tone shift is enough.

### Layout

```
┌──────────────── max-w-[600px] mx-auto ─────────────────┐
│                                                         │
│  Good morning, Maya                                     │
│  Today is Tuesday, May 4 · It's 4:15 PM                 │
│                                                         │
│  What can we get for Maya Deli today?                   │
│                                                         │
│  Resume draft for Apr 25, 2026 [accent block]           │
│  — or start a new order —                               │
│  for delivery May 2 · Change date                       │
│                                                         │
│  REORDER A RECENT ORDER                                 │
│  [list rows]                                            │
│                                                         │
│  OR                                                     │
│  [Order your usuals]    [Start from scratch]            │
│                                                         │
├──── border-t  bg-muted/30 ──────────────────────────────┤  ← zone seam
│                                                         │
│  FOR YOU [announcements feed]                           │
│  RECENT ORDERS [list]                                   │
│  PAST ORDERS                                            │
│  Account stats card                                     │
└─────────────────────────────────────────────────────────┘
```

### Greeting fallbacks

| `contact_name` | `business_name` | Greeting | Question |
|---|---|---|---|
| "Maya" | "Maya Deli" | "Good morning, Maya" | "What can we get for Maya Deli today?" |
| "Maya" | empty | "Good morning, Maya" | "What can we get for Maya today?" |
| empty | "Maya Deli" | "Good morning" | "What can we get for Maya Deli today?" |
| empty | empty | "Good morning" | "What can we get for you today?" |

### Period-of-day boundaries

| Hour (local) | Greeting |
|---|---|
| 0–4 | Good evening |
| 5–11 | Good morning |
| 12–16 | Good afternoon |
| 17–23 | Good evening |

## Iteration 4 (atmospheric hero)

After iteration 3 the structure was right but the page still didn't read
as *impressive* — it read as well-organized text on a white background.
Customer feedback:

> "It's not pretty and it looks bad on desktop. Make it impressive."

Three "impressive" candidates were considered: editorial magazine,
atmospheric hero with imagery, minimal Apple/Linear. The customer
picked atmospheric hero.

### What changed

- `<HomepageGreeting>` is replaced by `<HomepageHero>`. Same
  time-aware greeting logic but now lives inside an atmospheric
  panel.
- The panel: `rounded-2xl` (intentionally larger radius than the
  rest of the page — it's a hero), navy gradient
  (`from-primary via-primary to-primary/85`), amber radial glow
  pinned to the top-right corner (`bg-accent/40 blur-3xl`), and a
  faint white wash bottom-left for depth. White display typography
  (`text-3xl md:text-4xl tracking-tight`) for the greeting; muted
  white (`text-white/70`) for the time line.
- The Resume Draft block moves out of `<StartOrderFork>` and into
  the hero, restyled as a glass-blur card layered over the gradient:
  `bg-white/15 backdrop-blur-md border border-white/20 text-white`.
- The "or start a new order" divider in the fork is removed — the
  visual zone change between hero and fork now does that work
  implicitly.
- The `<StartOrderFork>` no longer needs the `token` prop — it never
  rendered the draft link itself, only the draft existence drove
  conflict detection. The draft itself is now linked from the hero.

### Layout

```
┌─────────────── max-w-[600px] mx-auto ──────────────┐
│ ╔═════════════════════════════════════════════╗   │
│ ║ ▓▓▓▓ navy gradient + amber glow ▓▓▓▓        ║   │
│ ║                                              ║   │
│ ║   Good evening, Maya                         ║   │
│ ║   Today is Saturday, April 25 · It's 8:46 PM ║   │
│ ║                                              ║   │
│ ║   What can we get for Maya Deli today?       ║   │
│ ║                                              ║   │
│ ║  ┌─────────────────────────────────────────┐║   │
│ ║  │ ●  Resume draft for Apr 25       →     │║   │ ← glass card
│ ║  │     3 items                            │║   │   over gradient
│ ║  └─────────────────────────────────────────┘║   │
│ ╚═════════════════════════════════════════════╝   │
│                                                    │
│  for delivery May 2 · Change date                  │ ← fork on
│  REORDER A RECENT ORDER                            │   page background
│  [list rows]                                       │
│  OR                                                │
│  [Order your usuals] [Start from scratch]          │
│                                                    │
├──── border-t  bg-muted/30 ────────────────────────┤  ← below-fold band
│ FOR YOU                                            │
│ RECENT ORDERS                                      │
│ PAST ORDERS                                        │
│ Account stats                                      │
└────────────────────────────────────────────────────┘
```

### Hero responsiveness

The hero stretches to its content height (no fixed aspect ratio).
On mobile (375px) the padding is `px-5 py-7`; on desktop (≥768px)
it's `px-8 py-10`. Greeting and question typography both step up
one size on `md:` (`text-3xl → text-4xl`, `text-base → text-lg`).
This produces a hero that reads ~280px tall on mobile with a draft,
~340px on desktop with a draft — comfortable above-the-fold without
pushing the fork too far down.

The amber glow is positioned with negative offsets so half of it
falls outside the panel; this gives the illusion of light bleeding
in from off-canvas, which reads more atmospheric than a bordered
gradient.

### What's deliberately not added

- **No actual product photography.** Real imagery is a follow-up;
  the gradient + glow alone is sufficient for the design phase. A
  background photo would be layered with `object-cover` + low
  opacity behind the gradient when assets land.
- **No animation.** The hero is calm. Adding a parallax glow or
  hover-shift on the resume card would feel showy. If we want
  motion later, the place to add it is on first hydration — a
  one-time fade-in of the greeting copy.
- **No additional accent affordances on the hero.** Doctrine Rule 6
  says one accent per region; the resume-draft glass card uses the
  amber dot for status, but the card itself is white-on-gradient
  rather than amber-tinted. The accent affordance below the fold
  (the topmost reorder row) is in a different region.

## Iteration 5 (no gradient, unified ordering panel)

After iteration 4 the customer pushed back on two things:

> "1. I don't like gradient.
>  2. I need all ordering options including resume, reorder and start
>     from scratch in one visually distinct area."

The gradient/glow/glass treatment read as too "marketing splash" for an
operational tool. And splitting the ordering paths between the hero
(Resume Draft) and a separate fork (Reorder, Usuals, Scratch)
fragmented what should be one decision.

### What changed

- `<HomepageHero>` is renamed to `<HomepageWelcome>` and stripped of
  the navy gradient, amber glow, glass-blur draft card, and white
  display-on-dark typography. It's now a plain type-driven block
  (`text-3xl md:text-4xl tracking-tight` foreground for the greeting;
  muted small text for the time line; foreground regular for the
  question). The impressiveness comes from typography + breathing
  whitespace + craft, not effects.
- `<StartOrderFork>` is the unified ordering panel — a single
  `rounded-2xl border bg-card` container that holds all four entry
  points to the order flow:
  1. **Resume Draft** (when present) — accent block at the top of the
     card, edge-to-edge across the card width, the figure
  2. **Date label** + Change date
  3. **Reorder a recent order** — list with Show more
  4. **Order your usuals** + **Start from scratch** — outline buttons
- The "OR" subheading inside the fork is dropped; the visual hierarchy
  inside the bordered card (figure → labeled list → outline buttons)
  conveys the same thing without an explicit divider word.
- Outline buttons inside the panel use `bg-background` (not `bg-card`)
  so they read as outline rectangles rather than nested cards.

### Layout

```
┌────────────────────────────── max-w-[600px] ──────────────────────────────┐
│                                                                           │
│   Good evening, Maya                                                      │
│   Today is Saturday, April 25 · It's 9:03 PM                              │
│                                                                           │
│   What can we get for Maya Deli today?                                    │
│                                                                           │
│   ╔═════════════════════════════════════════════════════════════════════╗ │
│   ║ ●  Resume draft for Apr 25 · 3 items                            →  ║ │ ← figure
│   ║                                                                     ║ │
│   ║ ┌─────────────────────────────────────────────────────────────────┐ ║ │
│   ║ │  for delivery May 2 · Change date                               │ ║ │
│   ║ │                                                                 │ ║ │
│   ║ │  REORDER A RECENT ORDER                                         │ ║ │
│   ║ │  ●  Apr 25 · 3 items · $79     [👁]  [Reorder]                  │ ║ │
│   ║ │                                                                 │ ║ │
│   ║ │  [★ Order your usuals →]   [Start from scratch →]               │ ║ │
│   ║ └─────────────────────────────────────────────────────────────────┘ ║ │
│   ╚═════════════════════════════════════════════════════════════════════╝ │
│                                                                           │
│   ──── below-fold panel  bg-muted/30 ───────────────────────────────────  │
│   FOR YOU [feed]                                                          │
│   RECENT ORDERS                                                           │
│   PAST ORDERS                                                             │
│   Account stats                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Resume Draft block (inside the unified card)

When `primaryDraft !== null`, the top edge of the panel is a full-width
accent block:

- `bg-accent text-accent-foreground` (no glass blur, no border)
- The card's `overflow-hidden` clips it to the rounded corners
- Status dot uses `bg-accent-foreground/30` for a subtle inverse
- Hover deepens the accent slightly (`hover:bg-accent/90`)

When no draft exists, the card's first row is just the date label.

### Doctrine compliance

- **Rule 1** — single figure: the Resume Draft accent block (or the
  topmost amber-tinted Reorder row when no draft); everything else is
  ground.
- **Rule 5** — radii: `rounded-2xl` on the unified card and the
  below-fold panel; `rounded-xl` on inner card-like elements
  (reorder rows, glass card removed).
- **Rule 6** — one accent per region: at most one accent affordance
  per zone. With a draft, the Resume block is the accent; without,
  the topmost reorder row is. The Usuals/Scratch buttons are always
  outline.
- **Rule 8** — hover/focus signals: handled by `<Button>` and the
  Resume Draft Link's `hover:bg-accent/90`.

## Plan format

This is a single-PR change. The implementation is one new component + one page rewrite + handoff doc update. No multi-step plan needed.
