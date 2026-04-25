# Design System Reference

Token → primitive → domain component stack. This file captures opinionated decisions that don't live in the code as self-explanatory constants. Code-level token definitions are in `app/globals.css` and `tailwind.config.ts`.

---

## Color tokens

Brand: navy `--primary` (214 64% 22%), amber `--accent` (28 90% 55%). Use `variant="accent"` on `<Button>` for hero CTAs only.

Status: `--status-{draft,submitted,delivered,cancelled}` + `-bg` pairs. Consume via `<StatusChip>` not raw Badge.

---

## Typography

Custom scale: `text-display-lg`, `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`. Geist Sans.

Use `.tabular` (or the `<Money>` component) for all money/quantity renders.

---

## Domain components

- `<StatusChip status>` — always use instead of raw Badge for order statuses.
- `<Money value compact? />` — always use instead of inline `{formatCurrency(...)}` in JSX.
- `<PageHeader title description breadcrumb actions />` — replaces every ad-hoc `<h1>` + actions row.
- `<StatCard label value delta href />` — dashboard/report numbers.
- `<EmptyState icon title description action />` — empty lists, no-results, failed loads.
- `<OutcomeScreen icon tone title description primary secondary />` — auth success, invalid-token, 404.

---

## Buttons

Buttons size to content by default — generous padding from the `size` tokens, no `w-full`. A full-bleed button reads as urgent/desperate; content-sized reads as measured.

**Hierarchy:**
- **Hero CTA** (max 1 per screen): `<Button variant="accent" size="lg">` — sized to content, typically right-aligned or centered inside a card.
- **Primary**: `<Button size="default">` — sized to content.
- **Secondary**: `<Button variant="outline">` or `secondary` — sized to content.
- **Inline/row**: `<Button size="sm">` or `xs`, ghost/outline — sized to content.

**`w-full` is reserved for three cases. Do not use it elsewhere:**
1. The action row inside a bottom-sheet confirmation (Delete / Cancel stacked on mobile).
2. A single primary submit at the bottom of a mobile form where the button is the entire row.
3. Never on desktop. Never on hero CTAs. Never on primary actions in a card.

Tap-target height is enforced by the `size` tokens (`default` is `h-10` on mobile). Don't solve that with width.

---

## Modals

**Backdrop:** all modals use a glass-blur overlay — `bg-foreground/30 backdrop-blur-md`. Never a dark solid.

**Two shapes** (established 2026-04-17):

1. **Creation / input modals** — `<Dialog>` / `DialogContent`. Centered on all viewports. Rounded `rounded-xl` on every corner. Side gutters of `1rem` via `w-[calc(100%-2rem)]`. Used for: sign-in, reorder, new-item forms, edit forms.

2. **Confirmation modals** — `<AlertDialog>` / `AlertDialogContent`. On mobile, a bottom sheet: flush on left/right/bottom, rounded **only on the top** (`rounded-t-xl`), slides up from below. On `sm:` and above, falls back to the centered creation shape with side gutters. Used for: delete confirms, destructive yes/no prompts.

Don't override overlay or positioning per instance. If a new shape is needed, treat it as a design-system decision, not a one-off className. Files: [components/ui/dialog.tsx](../components/ui/dialog.tsx), [components/ui/alert-dialog.tsx](../components/ui/alert-dialog.tsx).

---

## Usage rules

- **Money in JSX** — always `<Money value={n} />`, never `{formatCurrency(n)}` inline.
- **Order status** — always `<StatusChip status={s} />`, never raw glyphs.
- **Page headings** — always `<PageHeader title="..." />`, never ad-hoc `<h1>`.
- **Outcome screens** (auth, 404) — always `<OutcomeScreen>`.
- **Colors** — no hardcoded hex. Use tokens (`bg-primary`, `text-status-submitted`).
- **Spacing** — no arbitrary values (`p-[13px]`). Use the 4px scale.
- **Modals** — center + glass blur per above. Do not reintroduce `bg-black/80`.

---

## Material tokens

Material tokens for glass surfaces. Defined in [`lib/design/surfaces.ts`](../lib/design/surfaces.ts). Composed by every glass-style component as its base; tweaks (corner radius, padding, ring) live on the component, not the recipe.

**`surfaceOverlay`** — `bg-background/80 backdrop-blur-md border border-foreground/10`. Anchored full-width chrome: cart bar, sheet headers/footers, top nav. Lives "on the page," lighter blur, semi-opaque so content reads through but the bar still feels solid.

**`surfaceFloating`** — `bg-background/60 backdrop-blur-2xl border border-white/40 shadow-2xl`. Detached focused object: popout capsule, search-trigger pill. Lifts off the page; heavier blur, subtle border highlight, soft drop shadow.

**`surfaceFloatingRecessed`** — `bg-foreground/10` plus an inset shadow recipe. Controls dug into a parent surface (the Stepper). Reads as a slot in the parent material.

**`surfaceOverlayPrimary`** — _Deprecated 2026-04-25_ for customer-surface use. Previously the cart-bar tint; per doctrine Rule 6 (one primary-tinted affordance per region), the cart bar now uses `surfaceOverlay`. Do not adopt for new customer-surface chrome.

Every glass surface picks one of the three active tokens. Anti-pattern: ad-hoc `bg-*/N backdrop-blur-*` declarations on individual components — that's how the four-recipe drift happened.

---

## Primitives (post Plan-C)

These primitives were introduced after the original "Domain components" section was written. They live in `components/ui/` and are consumed across the customer surface.

### `<Stepper quantity onChange min? max? size? ariaLabel? />`

Path: [`components/ui/stepper.tsx`](../components/ui/stepper.tsx).

Canonical quantity stepper. A single dug-in pill with `−`, an editable numeric input, and `+`. Tap `+` / `−` to nudge by one; tap the number to type a value. Defaults: `min = 0`, `max = 999`, `size = 'sm'` (h-9). Use `size = 'md'` (h-10) inside the popout. Always renders the `surfaceFloatingRecessed` material.

Use everywhere a product can be added or modified — usuals tiles (as overlay), FamilySheet tiles (as overlay), inline-search-results tiles (as overlay), the popout body, the review-sheet line items.

Anti-pattern: building a custom `−/+` stepper with outline buttons. The legacy `<QuantitySelector>` alias delegates to `<Stepper>`; new code imports `Stepper` directly.

### `<FilterChip active? onClick? variant? />` and `<FilterChipRow label? />`

Path: [`components/ui/filter-chip.tsx`](../components/ui/filter-chip.tsx).

Pill chip for filter state. `active` uses primary fill (one weight per Rule 7); `variant="ghost"` for neutral chips like the FamilySheet pill switcher's brand/size filter rows. Wrap in `<FilterChipRow label="Brand">` for the labeled-row layout.

Anti-pattern: hand-rolled chip styles in feature code. If a chip behaves differently, extend `FilterChip` rather than fork.

### `<SurfaceHeader>` and `<SurfaceFooter>`

Path: [`components/ui/surface.tsx`](../components/ui/surface.tsx).

Glass header/footer bands for sheets. Both use `surfaceOverlay` plus a `border-b` / `border-t`. Consumed by `<FamilySheet>` and `<ReviewOrderSheet>`. Contents are slotted via children.

Anti-pattern: ad-hoc header chrome (custom drag-handle, custom border) in a sheet component. Use `SurfaceHeader` so chrome stays consistent across sheet types.
