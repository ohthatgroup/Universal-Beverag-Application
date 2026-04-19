# ST-9 Round 2 Issues

Running log of issues spotted during the P0 redesign that were deferred. Addressed in a later pass.

---

## Portal home

- **Hero `Start order` CTA stretches full-width on desktop.** At the `(portal)` max-w-4xl container, the flex parent collapses to column direction before `sm:` kicks in properly, so `w-full sm:w-auto` resolves to `w-full`. Fix: either drop `w-full` and let the button size to content, or move the width control into a container query. File: [components/portal/start-order-hero.tsx](components/portal/start-order-hero.tsx)
- **Mobile bottom nav shows on desktop too.** Pre-existing behavior in [components/layout/customer-nav.tsx](components/layout/customer-nav.tsx) — the `fixed ... md:hidden` bar is still rendering on the desktop viewport captured in screenshots. Confirm the breakpoint logic; may be a screenshot artifact of the preview viewport.
- **Draft chip on desktop doesn't wrap nicely.** At wide viewports the single-draft chip sits at its min-width instead of filling; looks visually orphaned. Consider a different layout (card row vs. chips) when `drafts.length === 1`.
- **"Change date" toggle is low-affordance.** It's just an underline-on-hover text link under the date. Consider a subtle chevron + border, or reveal the picker inline by default at `sm:` widths.
- **`DateSelectorCard` is now unused by the portal home but still ships.** [components/orders/date-selector-card.tsx](components/orders/date-selector-card.tsx) — delete once every remaining caller migrates.

## Order list / cards

- **No empty-state component when a customer has zero orders at all.** Current copy: "No active orders." / "No order history yet." Use `<EmptyState>` with an icon + a primary CTA to `Start order` instead.
- **Past-orders `<details>` toggle chevron rotates via `group-open:rotate-180`** but the summary still shows the default marker dot on Firefox because `[&::-webkit-details-marker]:hidden` is WebKit-only. Add `list-none` on the `<summary>` at CSS level for Firefox parity.

## Design system / primitives

- **Button `variant="accent"` (amber) has no focus-visible ring tuned for the amber background.** The default `focus-visible:ring-ring` is navy, which is fine but not strongly contrasting on amber. Revisit once we add more hero CTAs.
- **`Money` tabular spacing** — tabular numerals work but font-feature-settings is applied body-wide; the `.tabular` utility is redundant. Leave alone unless we see real inconsistency.

## Auth

- **Admin login lands at `/` instead of a dedicated `/auth/login` when unauthenticated.** The redirect target from middleware dumps the user at root, which happens to render the admin sign-in form. Should use an explicit `/auth/login` route for clarity.

## Accessibility

- **Draft chips link entire card but have no `aria-label`** — the content reads "DRAFT Apr 17, 2026 2 items" which is fine semantically, but explicit `aria-label="Continue draft for Apr 17, 2026, 2 items"` would be clearer.
- **`<details>` for past orders is keyboard accessible but announces "disclosure"** to screen readers. Verify the heading structure (we use `text-h3` on the summary) doesn't collide with page heading order.
