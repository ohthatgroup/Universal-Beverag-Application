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
2. A single primary submit at the bottom of a mobile form where the button is the entire row. Example: the `<CartReviewSurface>` Submit button is `w-full` on mobile under this case. The review drawer is a form (review + submit), not a navigation surface.
3. Never on desktop. Never on hero CTAs. Never on primary actions in a card.

Tap-target height is enforced by the `size` tokens (`default` is `h-10` on mobile). Don't solve that with width.

---

## Modals

**Backdrop:** `<Panel>` and `<AlertDialog>` both use a glass-blur overlay — `bg-foreground/30 backdrop-blur-md`. Never a dark solid.

**One primitive, three variants** (established 2026-04-25 in the surface system rebuild):

`<Panel variant="centered">` — creation / input forms (sign-in, edit forms, the product popout). Centered on viewport. Rounded `rounded-xl`. Side gutters of `1.5rem` via `w-[calc(100vw-1.5rem)]`. Default max-width `max-w-md`; override via `contentClassName`.

`<Panel variant="bottom-sheet" width="content">` — panels anchored to the bottom of the page. Slides up from the bottom with iOS-sheet easing (`ease-ios-sheet`, ~280ms). On mobile, edge-to-edge with rounded top corners. On desktop, contained to body width (`max-w-3xl`, `mx-auto`). Optional iOS-style drag handle on mobile. Used for: `<FamilySheet>`, the open state of `<CartReviewSurface>`.

`<Panel variant="side-sheet">` — secondary panels stacked over a bottom-sheet. Slides in from the right edge. `w-[85vw] max-w-sm` on mobile, `w-96` on desktop. Used for: the family-sheet filter panel.

`<AlertDialog>` is unchanged — a different DOM contract for confirmations (yes/no destructive prompts), not a panel. See [components/ui/alert-dialog.tsx](../components/ui/alert-dialog.tsx).

Don't override overlay or positioning per instance. If a new shape is needed, treat it as a design-system decision, not a one-off className.

**The cart-review continuum:** `<CartReviewSurface>` is the one place the panel system breaks shape — it has both an "ambient" closed state (the cart bar) and an "open" state (the review drawer using bottom-sheet shape). The two states share footer-row content (item count + accent CTA → total + Submit) so opening reads as the bar lifting into the panel rather than two surfaces stacking. See [components/catalog/cart-review-surface.tsx](../components/catalog/cart-review-surface.tsx).

Files: [components/ui/panel.tsx](../components/ui/panel.tsx), [components/ui/dialog.tsx](../components/ui/dialog.tsx), [components/ui/alert-dialog.tsx](../components/ui/alert-dialog.tsx).

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

Material tokens for the customer surface. Defined in [`lib/design/surfaces.ts`](../lib/design/surfaces.ts).

**`surfaceFloatingRecessed`** — `bg-foreground/10` plus an inset shadow recipe. Used by the canonical `<Stepper>` to render as a slot dug into its parent surface.

Panels (popouts, bottom sheets, side sheets) own their own surface via the `<Panel>` primitive — see Modals below. The previous four-token system (`surfaceOverlay`, `surfaceOverlayPrimary`, `surfaceFloating`) was retired 2026-04-25 in favor of the unified Panel primitive.

---

## Primitives (post Plan-C)

These primitives were introduced after the original "Domain components" section was written. They live in `components/ui/` and are consumed across the customer surface.

### `<Stepper quantity onChange min? max? size? ariaLabel? />`

Path: [`components/ui/stepper.tsx`](../components/ui/stepper.tsx).

Canonical quantity stepper. A single dug-in pill with `−`, an editable numeric input, and `+`. Tap `+` / `−` to nudge by one; tap the number to type a value. Defaults: `min = 0`, `max = 999`, `size = 'sm'` (h-8) for grid contexts, `size = 'md'` (h-10) for the popout. Always renders the `surfaceFloatingRecessed` material.

**Glass treatment.** `surfaceFloatingRecessed` is `bg-background/70 backdrop-blur-md border border-foreground/15` plus an inset shadow. The translucent fill + blur means the pill reads cleanly when it overlays a product image; the inset shadow keeps it feeling dug into the parent surface, not floating above it. This is the only material token that survived the 2026-04-25 surface rebuild — see [Material tokens](#material-tokens) below.

**Sizing for tile overlays.** `size = 'sm'` is sized to fit comfortably inside the FamilySheet's 3-column grid on a 375px viewport (~117px tile width). The Stepper renders inside `<ProductTile overlaySlot={...}>` with a tight `inset-x-1 bottom-2` overlay container so it sits inside the image bounds.

Use everywhere a product can be added or modified — usuals tiles (as overlay), FamilySheet tiles (as overlay), inline-search-results tiles (as overlay), the popout body, the review-drawer line items.

Anti-pattern: building a custom `−/+` stepper with outline buttons. The legacy `<QuantitySelector>` alias delegates to `<Stepper>`; new code imports `Stepper` directly.

### `<FilterChip active? onClick? variant? />` and `<FilterChipRow label? />`

Path: [`components/ui/filter-chip.tsx`](../components/ui/filter-chip.tsx).

Pill chip for filter state. `active` uses primary fill (one weight per Rule 7); `variant="ghost"` for neutral chips like the FamilySheet pill switcher's brand/size filter rows. Wrap in `<FilterChipRow label="Brand">` for the labeled-row layout.

Anti-pattern: hand-rolled chip styles in feature code. If a chip behaves differently, extend `FilterChip` rather than fork.

### `<Panel variant onOpenChange ... />`

Path: [`components/ui/panel.tsx`](../components/ui/panel.tsx).

Single primitive for every modal-like surface. Three variants — `centered`, `bottom-sheet`, `side-sheet`. Composes Radix Dialog primitives under the hood (focus trap, Escape, overlay click). Owns the panel surface (`bg-background`, `rounded-xl`, `overflow-hidden`, `border`, `shadow-2xl`).

**Slots.** `Panel.Header`, `Panel.Body`, `Panel.Footer` are static-property subcomponents that contribute only their separator line (`border-b` / `border-t`) — the parent `<Panel>` owns the surface. Don't apply `surface*` recipes to slot children; they'd double-tint over the panel's `bg-background`.

**Props.**

| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` | Required. |
| `onOpenChange` | `(open: boolean) => void` | Required. |
| `variant` | `'centered' \| 'bottom-sheet' \| 'side-sheet'` | Default `'centered'`. |
| `width` | `'content' \| 'full'` | Bottom-sheet/side-sheet only. `'content'` constrains to `max-w-3xl` on desktop; `'full'` is edge-to-edge. |
| `showDragHandle` | `boolean` | Bottom-sheet only. Default `true`; renders the iOS-style drag handle on mobile. |
| `srTitle` | `string` | Required-by-Radix screen-reader title. Pass either via this prop or render `<DialogPrimitive.Title>` inside `Panel.Header`. |
| `preventAutoFocus` | `boolean` | When `true`, prevents Radix from auto-focusing the first focusable child on open. **Use for popouts whose first focusable child is a text input** — without this, opening the popout pops the iOS keyboard before the user is ready. The `<ProductPopout>` sets this. |
| `overlayClassName`, `contentClassName` | `string` | Escape-hatch overrides. |

Use anywhere a panel-style surface is needed. Anti-pattern: ad-hoc `<DialogContent>` with custom positioning className. If a new shape is needed, extend Panel rather than fork.

### `<FamilyPillSwitcher activeFamily onSelect />`

Path: [`components/catalog/family-pill-switcher.tsx`](../components/catalog/family-pill-switcher.tsx).

Floating per-family pill switcher rendered inside the FamilySheet panel content. Each pill carries the family icon + label and is colored by family — the active pill is a saturated fill of the family hue; inactive pills are a muted same-hue tint with a darker (`-300`) same-hue border so the active pill is unmistakable.

Per-family colors:

| Family | Active fill | Inactive tint | Inactive border |
|---|---|---|---|
| Soda | `bg-red-500 text-white` | `bg-red-50 text-red-700` | `border-red-300` |
| Water | `bg-sky-500 text-white` | `bg-sky-50 text-sky-700` | `border-sky-300` |
| Sports & Hydration | `bg-emerald-500 text-white` | `bg-emerald-50 text-emerald-700` | `border-emerald-300` |
| Tea & Juice | `bg-amber-500 text-white` | `bg-amber-50 text-amber-800` | `border-amber-300` |
| Energy & Coffee | `bg-violet-500 text-white` | `bg-violet-50 text-violet-700` | `border-violet-300` |
| Other | `bg-foreground text-background` | `bg-muted text-muted-foreground` | `border-foreground/20` |

The pill row is positioned `fixed inset-x-0 top-3` (mobile) / `top-4` (desktop) so it visually anchors to the viewport top, sitting above the panel. The `FamilyPillSwitcher` is rendered as a child of the bottom-sheet `<Panel>` content (not a sibling) so Radix doesn't treat pill taps as outside-clicks and dismiss the sheet. Pills also `stopPropagation` on `pointerDown` to belt-and-braces against Radix's outside-click detection.

Anti-pattern: rendering the pill row outside the Panel as a separate fixed element — Radix will dismiss the panel on the first pill tap. Anti-pattern: using a single neutral palette for all pills — the per-family colors are part of the navigation affordance.

---

## Doctrine rules (customer portal surface)

These rules are derived from `docs/superpowers/specs/2026-04-25-portal-design-doctrine-update-design.md`. Each carries a code-pointer footnote where applicable. The doctrine supersedes [`docs/archive/st-9-portal-design-theory.md`](archive/st-9-portal-design-theory.md).

**1. Object-first, form-grade, one figure per screen.** Usuals dominate; browse is the escape hatch. Rows, steppers, inline edits — no heroes, no marketing rails. Exactly one region competes for attention. Anti-pattern: a "deals carousel" or "featured products" rail on the order page.

**2. Glass material is reserved for surfaces that float over content.** Page itself is solid `bg-background`. Glass appears only on sheet overlays, the cart bar pill on desktop, the popout capsule, dug-in steppers, and floating overlays on tiles. Glass is always semantic. Anti-pattern: `backdrop-blur` on a section heading; gradients on the page background.

**3. The dug-in pill is the canonical control surface.** Single component (`<Stepper>`) used everywhere a product can be added — popout body and floating overlay on every product tile. Anti-pattern: custom outline-button stepper, reusing the dug-in pill for non-quantity inputs.

**4. Steppers on product tiles overlay the image as a floating glass pill.** Image fills the tile; the Stepper pill floats centered at the bottom (`inset-x-3 bottom-3`); tile does not grow vertically. See `<ProductTile overlaySlot={…}>`. Anti-pattern: a separate stepper bar that grows the tile height.

**5. Two corner-radius rules.** `rounded-xl` (12px) for containers; `rounded-full` for pill controls. No `rounded-md`, no `rounded-2xl`, no `rounded-3xl`. Text-style inputs (date, search) classed as containers for radius purposes. Anti-pattern: per-instance radius overrides.

**6. Accent reserved for committing.** Amber `accent` = Review, Submit. Primary navy = active state (qty badges, active filter chip). Within a single visible region, **at most one** affordance is tinted. The cart bar uses neutral `bg-background` (plain, not glass); the accent Review button is the single signal. Anti-pattern: multiple primary-tinted affordances visible in the same region.

**7. Active state is single-weight.** `border-primary` (full opacity, 1px) on an active tile — no ring, no shadow stack. Anti-pattern: `border-primary/60 ring-1 ring-primary/40` (the previous double-weight pattern).

**8. Hover and focus signals are mandatory on every interactive surface.** Every clickable surface signals hover via `hover:bg-*` / `hover:border-*`. Every focusable surface uses `focus:outline-none focus:ring-2 focus:ring-ring`. Disabled elements: `disabled:opacity-40 disabled:cursor-not-allowed`. Anti-pattern: tap-to-discover affordances; pencil icons that signal interactivity without the underlying control also signaling it.

**9. Three panel shapes plus AlertDialog, no fourth.** `<Panel variant="centered">` for creation/input forms. `<Panel variant="bottom-sheet">` for panels anchored to the bottom (the FamilySheet, the open state of CartReviewSurface). `<Panel variant="side-sheet">` for secondary panels (the filter sheet stacked over FamilySheet). `<AlertDialog>` for destructive confirmations. A new shape requires updating this doctrine and the Panel primitive. Anti-pattern: a custom-positioned `<DialogContent>` overriding the shared shape.

**10. One simultaneous sticky surface.** At most one fixed-position element on top of the scroll content (the cart bar). When a sheet opens, the cart bar remains fixed underneath because it's still relevant. Anti-pattern: a sticky page header on top of the cart bar.

**11. Autosave or commit, never both.** Quantity changes autosave (300ms debounce via `useAutoSavePortal`). The order itself commits explicitly via Submit. The delivery date commits inline on Enter/blur — the same model. No "Save" button on the order page; no dirty-state banner.

**12. Navbar is page chrome, not a competing surface.** The `<PortalTopBar>` (`components/layout/portal-top-bar.tsx`) is part of the static page above the scroll content — `border-b bg-background`, no `fixed` positioning, no glass treatment. It does not compete with `<CartReviewSurface>` for sticky-surface attention (Rule 10). Account icon is the only persistent affordance; brand link demotes to muted text. A back-arrow lives in `<PortalPageHeader>` (the in-content page header), not the topbar — the topbar has no navigational ambition. Anti-pattern: a sticky topbar layered over the cart bar; account dropdowns or search bars in the topbar; primary CTAs in the topbar.

---

## Page-level layouts

The customer portal layout (`app/(portal)/portal/[token]/layout.tsx`) wraps every portal page in:

- `<PortalTopBar>` — page chrome (Rule 12).
- `<main>` — page content container constrained to `max-w-3xl mx-auto p-4 md:p-6`.

Pages render their content inside the main container. The `<CartReviewSurface>` is rendered by the order builder (`<OrderBuilder>` inside `app/(portal)/portal/[token]/order/...`), NOT by the layout — the bar only appears where there's an active order context. Pages that aren't order builders (the homepage, account, orders list) do not render the cart bar.

**Body padding for the cart bar.** The order builder applies `pb-28` to its root so the fixed-bottom cart bar doesn't cover content. Pages without `<CartReviewSurface>` don't need this. If you add a new fixed-bottom surface to a non-order-builder page, you violate Rule 10 (one simultaneous sticky surface) — escalate before doing it.

**Body width alignment with the cart bar.** Both the cart bar (closed state, on desktop) and the open-state review drawer use `md:max-w-3xl md:mx-auto` so they align with the page's content column. Page content is also `max-w-3xl mx-auto`. Don't override either side.

**Modals composing with pages.** `<Panel>` portals into `document.body` via Radix, so pages don't need to "make room" for them. The page's max-w-3xl content stays put while the panel takes whatever shape its variant prescribes (centered / bottom-sheet anchored / side-sheet right edge).

---

## Mobile viewport

`app/layout.tsx` exports a baseline viewport meta:

```ts
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}
```

Without this, mobile Safari falls back to its 980px default viewport and scales pages down to fit, making everything look smaller than the design intent. This baseline applies app-wide.

The customer portal layout (`app/(portal)/portal/[token]/layout.tsx`) **overrides** this with:

```ts
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}
```

This locks zoom on the portal. Two reasons:

1. **iOS keyboard auto-zoom-and-stay.** When an `<input>` with font-size < 16px gains focus, iOS Safari auto-zooms the page and refuses to zoom back out when the keyboard dismisses. `maximumScale=1` blocks the auto-zoom. (The standard alternative — force every input to 16px — fattens the visual design; locking the viewport is the surgical option.)
2. **Tap targets are already comfortably sized.** The Stepper minimum is `h-8`; tile open-targets are full-card. Customers don't need to pinch-zoom an order page.

Admin pages inherit the root viewport and keep pinch-zoom — the lock is scoped to `/portal/[token]` only.

Anti-pattern: dropping `maximumScale=1` to allow pinch-zoom on the portal — you'll get the keyboard-zoom bug back. Anti-pattern: applying the lock app-wide — admins legitimately pinch-zoom report tables.
