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

## Plan format

This is a single-PR change. The implementation is one new component + one page rewrite + handoff doc update. No multi-step plan needed.
