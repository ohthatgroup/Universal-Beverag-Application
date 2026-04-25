# Portal Design Doctrine Update — 2026-04-25

> **Shipped 2026-04-25; partially superseded.** Rules 1–8 and 10–11 below shipped as-described and remain authoritative (they live in [`docs/design-system.md`](../../design-system.md)). **Rule 9 (modal shapes) is superseded** by the surface-system rebuild that immediately followed this doctrine — see [`2026-04-25-surface-system-rebuild-design.md`](./2026-04-25-surface-system-rebuild-design.md). The rebuild collapsed the three Radix primitives (`<Dialog>`, `<AlertDialog>`, `<Sheet side="bottom">`) into a single `<Panel>` primitive with three variants (`centered`, `bottom-sheet`, `side-sheet`); `<AlertDialog>` is unchanged. References to `<SurfaceHeader>`, `<SurfaceFooter>`, `<CartSummaryBar>`, `<ReviewOrderSheet>`, `surfaceOverlay`, `surfaceOverlayPrimary`, and `surfaceFloating` in this spec are historical — those primitives and tokens were deleted in the rebuild. Read [`docs/design-system.md`](../../design-system.md) for the current state. This file is retained as the founding doctrine record.

## Context

The portal customer order page was originally built against
[`docs/archive/st-9-portal-design-theory.md`](../../archive/st-9-portal-design-theory.md).
That theory established the founding principles: object-first, form-grade,
one figure per screen, recurring-task tool not a shopping destination. It
explicitly **rejected** glass morphism, multiple corner radii, and any
decoration without information.

In the time since, Plan C and the post-Plan-C consistency passes
introduced new patterns the founding theory does not authorize:

- Glass surfaces (sheet overlays, popout capsule, floating cart bar pill,
  dug-in stepper)
- Multiple corner radii (`rounded-xl`, `rounded-2xl`, `rounded-3xl`,
  `rounded-full`)
- A `Sheet` modal shape (third shape; the old theory documented two)
- `bg-primary/10` tint on the cart bar (signals "you have items")
- Floating pill cart bar on desktop (the old theory said the cart bar
  should be inline at page end on desktop, not sticky)

Those choices delivered real product wins: image-first packaging
recognition, faster reorder via tile + inline stepper, a system that
*feels* modern enough that wholesale operators perceive it as a current
tool rather than a 2015 form. None of that is in the founding theory.

This spec is the **explicit retirement** of the founding theory and the
adoption of a successor that absorbs what works and tightens what
drifted. Glass and the dug-in pill stay. The original theory's
discipline (task-first, accent-as-commit, no decoration without
information) is preserved verbatim where it still applies. New rules
are added where Plan C surfaced gaps the original didn't anticipate.

The audience for this doc is the next contributor reading the codebase
and wondering "what are the rules for adding a new component to the
customer surface." Today, that contributor would not know the
`<Stepper>`, `<FilterChip>`, `<SurfaceHeader>`, or `surface-*` material
tokens exist; the existing
[`docs/design-system.md`](../../design-system.md) predates them.

## Goals

1. Update [`docs/design-system.md`](../../design-system.md) to reflect
   what's actually in code today: the new primitives, the material
   recipes, the third modal shape, and the codified rules below.
2. Lock 11 rules as the new doctrine for the customer portal surface.
   Each rule is sourced from a specific decision made during this
   review; each has an explicit anti-pattern.
3. Surface the divergences between the new doctrine and the current
   code, and produce the bounded list of code changes required to
   bring code into compliance.
4. Mark [`docs/archive/st-9-portal-design-theory.md`](../../archive/st-9-portal-design-theory.md)
   as superseded; pin the new doctrine as canonical.

## Non-goals

- Admin surface redesign. Plan B's admin product capture and the
  `<Stepper>` upgrade landed on admin via the legacy `QuantitySelector`
  alias, but the admin surface has its own theory document
  ([`docs/archive/st-9-admin-design-theory.md`](../../archive/st-9-admin-design-theory.md))
  and its own task profile. Admin doctrine is its own conversation.
- New primitives. We are documenting and refining what exists, not
  introducing additional components.
- Page-level layout redesign. The page's information hierarchy
  (search → usuals → browse → cart) is settled. This spec governs the
  *materials and controls* used at each layer, not their arrangement.
- The image-first content strategy itself. That decision is in Plan C
  and stands.

---

## The 11 doctrine rules

### 1. Object-first, form-grade, one figure per screen

**Kept verbatim from the founding theory.**

Usuals dominate; browse is the escape hatch. The page surfaces the
customer's frequent SKUs as the primary affordance. Family browse is
the secondary path for "I need something I don't usually order."

Rows, steppers, inline edits — no heroes, no marketing rails, no
promotional banners.

Exactly one region competes for attention. When the FamilySheet is
open, the page below is ground; when the popout is open, the
FamilySheet is ground.

**Anti-pattern.** Adding a "deals carousel" or "featured products" rail
to the order page. That's catalog/e-commerce grammar, rejected.

### 2. Glass material is reserved for surfaces that float over content

The page itself is solid `bg-background`. Glass appears only on:

- Sheet overlays (`bg-foreground/30 backdrop-blur-md`) — the page is
  visible behind, blurred
- The cart bar on desktop (floating pill above the page)
- The popout capsule (focused floating object)
- The dug-in stepper inside another surface (recessed control)
- The floating stepper pill overlaid on a product tile

Glass is **always semantic** — it signals "this is over the page, not
part of it." Never decoration.

**Material tokens** (from `lib/design/surfaces.ts`):

| Token | When to use |
|---|---|
| `surfaceOverlay` | Anchored full-width chrome (cart bar, sheet headers/footers). Lighter blur, semi-opaque, "lives on the page." |
| `surfaceFloating` | Detached focused object (popout capsule, search-trigger pill). Lifts off the page; heavier blur, border highlight, drop shadow. |
| `surfaceFloatingRecessed` | Controls dug into a parent surface (the stepper). Inset shadow + translucent fill — reads as a slot in the parent material. |

`surfaceOverlayPrimary` exists in the file but is **deprecated by this
doctrine** (see Rule 6 — the cart bar drops the primary tint).

**Anti-pattern.** A page-section heading with `backdrop-blur`. A `<div>`
that's "glassy because it looks nice." Page background gradients
(rejected).

### 3. The dug-in pill is the canonical control surface

The recessed pill — translucent inset over a parent glass surface — is
**the** control language for quantity input. Used everywhere a product
can be added or modified:

- Inside the popout capsule (the larger `size="md"` Stepper)
- As a **floating overlay on every product tile** (see Rule 4 below)

This is the same `<Stepper>` component (`components/ui/stepper.tsx`)
in both contexts. It does not appear on page-level chrome that isn't
about quantity input — i.e., it's not a generic "input look."

**Anti-pattern.** A custom outline-button stepper. Reusing the dug-in
pill for non-quantity inputs.

### 4. Steppers on product tiles overlay the image as a floating glass pill

This is the rule that propagates *one-tap add* across every product
grid on the customer surface.

**Visual:**

```
┌──────────────────────────────────┐
│                                  │
│      [packaging image            │
│       fills entire tile]         │
│                                  │
│       ┌─────────────────┐        │
│       │   −   2   +     │        │  ← floating dug-in pill, image
│       └─────────────────┘        │     continues behind/around
└──────────────────────────────────┘
```

The pill is **centered horizontally**, anchored to the bottom of the
image area with breathing room (bottom-inset matches side-inset to
look intentional — `inset-x-3 bottom-3` or similar). Image is full
bleed; the tile does **not** grow vertically to accommodate the pill.

The pill uses `surfaceFloatingRecessed` over the image. Tapping the
pill changes quantity. Tapping the image (anywhere outside the pill)
opens the product popout for full details.

**Surfaces this applies to:**

- Usuals grid (current usuals tile is rebuilt under this rule —
  currently has a separate stepper *bar below* the image; that
  becomes the floating overlay)
- FamilySheet product tiles, in both size-brand and brand-led grouping
- Inline page-search results
- Any future product grid (recently-ordered, recommendations, etc.)

The popout retains its existing dug-in pill location (inside the
glass plate at the bottom of the capsule). The popout is the
focused-detail surface, not a tile.

**Anti-pattern.** A separate stepper bar that grows the tile height.
A non-overlay stepper outside the image area. A stepper anchored to
the top of the tile (the image foreground is where packaging
identification lives).

### 5. Two corner-radius rules

**Replaces the founding theory's "one radius: `rounded-md`" rule.**

| Radius | Used on |
|---|---|
| `rounded-xl` (12px) | Containers — page-level cards, the page-search wrapper, FamilyCards, usuals tiles, FamilySheet product tiles, sheet content panels |
| `rounded-full` | Controls — buttons, steppers, chips, the cart bar pill |

That is **the entire vocabulary**. No `rounded-md`, no `rounded-2xl`,
no `rounded-3xl`. Anything currently using those gets brought to one
of the two values.

The popout capsule is in this doctrine **a container**, so it becomes
`rounded-xl`. (The previous `rounded-3xl` was an exception that got
rejected during this review's strict-radius decision.)

**Anti-pattern.** Per-instance radius overrides via className. Mixed
radii within a single card.

### 6. Accent reserved for committing

**Kept from the founding theory, with a tightening.**

The amber `accent` color is for **committing actions** — Review,
Submit. Only those.

Primary navy (`bg-primary`, `bg-primary/10`, `border-primary`) is for
**active state** — qty badges on tiles, active filter chip, active
family pill in the FamilySheet switcher.

**Doctrine refinement:** within a single visible region, **at most one
affordance** uses an active tint. The cart bar previously had both
primary tint *and* an accent button — that's two simultaneous
affordances. **The cart bar drops the primary tint.** The accent
Review button is the single signal. The bar reverts to the neutral
`surfaceOverlay` material on every breakpoint.

**Anti-pattern.** Multiple primary-tinted affordances visible in the
same region. Decorative use of accent on non-committing actions.

### 7. Active state is single-weight

Currently a usuals tile in the cart shows
`border-primary/60 ring-1 ring-primary/40` — a primary border AND a
primary ring. Two visual weights for one signal.

**Rule:** active state uses *one* visual weight. Choose either border
*or* ring; not both. The doctrine choice is **a single primary border
at full opacity** (`border-primary` 1px). The `ring-1` is dropped.

This is an instance of Rule 6 (one affordance per region). Listed
separately because it touches a different mechanism.

**Anti-pattern.** Stacking border + ring + shadow for a single state.

### 8. Hover and focus signals are mandatory on every interactive surface

The audit found three surfaces that lack hover affordance:

- Date control in the page header
- Page-level search input wrapper
- (Verify on each new component before merge)

**Rule:** every clickable surface signals hover via `hover:bg-*`,
`hover:border-*`, or `hover:opacity-*`. Every focusable surface gets
the same focus ring (`focus:outline-none focus:ring-2 focus:ring-ring`).

Disabled elements communicate disabled state visually (opacity) **and**
via `cursor: not-allowed`. The current Stepper at qty=0 has the right
opacity but `cursor: default`; that's a bug.

**Anti-pattern.** Tap-to-discover. Pencil icons that signal interactivity
without the underlying control also signaling it.

### 9. Three modal shapes, no fourth

| Shape | Used for |
|---|---|
| `<Dialog>` (centered) | Creation / input forms — sign-in, reorder, new-X edit forms, the product popout |
| `<AlertDialog>` (bottom-sheet on mobile, centered on desktop) | Confirmations — delete prompts, destructive yes/no |
| `<Sheet side="bottom">` | Panels — FamilySheet, ReviewOrderSheet, FilterPanel-on-mobile |

The popout is a `<Dialog>` even though it slides up like a sheet —
because it's a *focused input form* (set qty), not a panel. That's
correct under this rule.

A new shape requires updating this doctrine. Don't ad-hoc.

**Anti-pattern.** A custom-positioned `<Dialog>` overriding the
shared shape. A bottom-sheet that isn't a `<Sheet>`.

### 10. One simultaneous sticky surface

The page has at most one fixed-position element at any time on top
of the scroll content: the cart bar.

If a sheet opens, the sheet itself is fixed; the cart bar remains
fixed underneath because it's still relevant to the order. That's two
simultaneous fixed surfaces — the only place the doctrine permits it,
because the sheet is over an overlay and the cart bar belongs to the
page underneath.

**Anti-pattern.** A sticky page header on top of the cart bar (header
+ cart bar = two stacks). A pinned filter rail on the page (would
make three).

### 11. Autosave or commit, never both

**Kept from the founding theory.**

Quantity changes autosave (the stepper writes to the order
immediately, debounced 300ms via `useAutoSavePortal`). The order
itself commits explicitly via Submit. There is no half-saved state and
no dirty-state tracking.

The delivery date editor (Plan C, Cluster 2) commits inline — a small
exception because it's a single field with a single transactional
PATCH, not an order-shape edit. Doctrinally, this is "autosave on
explicit commit (Enter / blur)" — same model.

**Anti-pattern.** A "Save" button on the order page. A dirty-state
banner on the order page.

---

## Explicit rejections

The doctrine **does not authorize** any of the following. They are
called out so a reader doesn't waste effort reasoning about them.

- Catalog/e-commerce hero patterns for re-provisioning. Image tiles
  are fine because they identify SKUs, not promote them. Banners,
  carousels, marketing rails are out.
- Glass as decoration. Backdrop-blur is reserved for floating
  surfaces (Rule 2). The page background does not blur. Section
  headings don't get glass. No tinted page-body gradients.
- Multiple simultaneous accent affordances (Rule 6). One accent CTA
  per visible region.
- Stacked active-state weights (Rule 7). One signal per active item.
- Decorative icons. Sparkles, Package fallbacks, ornamental glyphs
  that don't directly clarify an action.
- Layered sticky surfaces (Rule 10). One pinned element on top of
  scroll content at a time.
- Tap-to-discover affordances (Rule 8). Every interactive surface is
  visibly interactive.
- More than two corner-radius scales (Rule 5). Two values, no
  exceptions.
- A fourth modal shape (Rule 9).

---

## Code-change list (derived from the doctrine)

The 11 rules surface a bounded set of fixes — every one of these is a
divergence between the new doctrine and current code.

### Rule 4 (floating pill on tiles) — affects multiple files

- **`components/catalog/usual-row.tsx`** — currently puts the stepper
  in a separate bar below the image. Rebuild to overlay the stepper
  pill on the image at the bottom-center, using
  `surfaceFloatingRecessed` and matching the FamilySheet tile pattern
  to-be-built.
- **`components/catalog/product-tile.tsx`** — the `footerSlot` prop
  currently renders a separate bar below the image. The slot should
  render its content as a floating overlay anchored to the bottom of
  the image (image stays full-bleed, no extra height). Rename
  `footerSlot` → `overlaySlot` to signal the new contract. **This is
  a breaking change to the prop name**; downstream call sites in
  `usual-row.tsx` and any new consumers under Rule 4 must be updated
  in the same commit.
- **`components/catalog/family-sheet.tsx`** — both the size-brand
  grouping and brand-led grouping render `<ProductTile>` with no
  stepper. Pass an `onSetQuantity(product, next)` callback through
  to the new `overlaySlot`, wired into the existing
  `setProductQuantity` flow in `OrderBuilder` (the same callback
  that already drives the usuals tile and the popout). The
  FamilySheet itself does not own the auto-save pipeline; it
  forwards the callback as it already does for `onOpenProduct`.
- **`components/catalog/inline-search-results.tsx`** — same change as
  FamilySheet tiles. Add the `onSetQuantity` prop, render
  `<ProductTile>` with the floating-pill stepper.

### Rule 5 (two radii)

- **`components/catalog/product-popout.tsx`** — `rounded-3xl` →
  `rounded-xl`.
- **`components/catalog/review-order-sheet.tsx`** — `rounded-2xl` /
  `rounded-t-2xl` → `rounded-xl` / `rounded-t-xl`.
- **`components/ui/sheet.tsx`** — verify the default sheet content
  radius matches the new rule.
- **Audit pass** — search the customer surface for any other
  `rounded-2xl` / `rounded-3xl` / `rounded-md` not authorized by
  Rule 5; align to `rounded-xl` (containers) or `rounded-full`
  (controls).

### Rule 6 (cart bar drops primary tint)

- **`components/catalog/cart-summary-bar.tsx`** — replace
  `surfaceOverlayPrimary` with `surfaceOverlay`. Drop the
  `border-primary/20` border. The accent Review button is the single
  affordance.
- **`lib/design/surfaces.ts`** — keep `surfaceOverlayPrimary` exported
  for legacy uses elsewhere (none currently on the customer
  surface), but mark with a JSDoc comment that it is deprecated for
  customer-surface use.

### Rule 7 (single-weight active)

- **`components/catalog/product-tile.tsx`** — when `quantity > 0`,
  current state is `border-primary/60 ring-1 ring-primary/40`.
  Change to `border-primary` (full opacity) only; drop the ring. Same
  on the in-cart card border.

### Rule 8 (hover + focus + disabled cursor)

- **`components/catalog/editable-delivery-date.tsx`** — date display
  button currently has no `hover:bg-*`. Add `hover:bg-muted` so the
  surface signals interactivity before tap.
- **`components/catalog/order-builder.tsx`** — the page-level search
  input wrapper currently has no hover affordance. Add
  `hover:bg-background/80` (or equivalent on the wrapping element so
  the user sees pre-tap feedback).
- **`components/ui/stepper.tsx`** — the disabled `−` button at qty=0
  has `disabled:opacity-40` but no `disabled:cursor-not-allowed`.
  Add the cursor rule.

### Rule 9 (modal shapes)

- No code changes expected. Verification step: grep the customer
  surface for ad-hoc dialog positioning that bypasses the shared
  shapes:
  ```
  rg "DialogContent" components/catalog components/portal | rg "top-|left-|inset-"
  ```
  Any hit is either a sanctioned shape (the popout's
  `block w-[calc(100vw-1.5rem)]`) or a violation. Rule 9 means
  violations get reverted.

### Rule 10 (one sticky)

- No code changes. Verify no future PR adds a sticky page header.

### Rule 11 (autosave or commit)

- No code changes. The order page already follows this. The doctrine
  documents it.

### Independent of any rule (Tier 1 bugs surfaced during audit)

These were uncovered during the audit ("touch everything") and are
real quality bugs not directly governed by a rule above, but are
within scope of "bring code in line with current decisions":

- **`components/ui/stepper.tsx`** — rapid-fire `+` clicks register as
  one increment because of stale-closure read on `quantity`. Fix:
  switch to functional update form (`onChange((current) => current +
  1)`) so each tap reads the latest value.
- **`components/ui/stepper.tsx`** — the input accepts arbitrary
  numbers including very large values. Add a soft cap (e.g., 999)
  with a clamp on commit and a visible message at the cap.
- **`components/catalog/family-sheet.tsx`** — tap-outside the sheet
  does not close it (only ESC does). Wire `onOpenChange` to close on
  overlay tap, matching expected modal behavior.
- **`components/catalog/editable-delivery-date.tsx`** — the hidden
  `<input type="date">` remains in the DOM and is keyboard-tabbable
  even when the editor is "closed" (display mode). Use a
  ref+conditional-render so the element only exists in DOM when in
  edit mode. (Phantom focusable surfaced in audit.)

---

## Documentation work

The actual deliverable is updates to two files:

### `docs/design-system.md`

Append three new sections:

1. **Material tokens.** Document the four `surface*` exports from
   `lib/design/surfaces.ts` with the use-case for each (Rule 2).
2. **Primitives.** Document `<Stepper>`, `<FilterChip>`,
   `<FilterChipRow>`, `<SurfaceHeader>`, `<SurfaceFooter>` — props,
   when to use, anti-patterns. (Existing primitives like `<Money>`,
   `<StatusChip>`, etc., are already documented.)
3. **Doctrine rules.** All 11 rules above, copied verbatim, with
   code-pointer footnotes.

Update the existing **Modals** section to reflect three shapes
(Rule 9) instead of two.

Update the existing **Buttons** section to acknowledge the
`w-full` Submit-button case in the review sheet (Cluster 4 of Plan
C) as compliant with case (2) of the existing `w-full` rules. No new
exceptions.

### `docs/archive/st-9-portal-design-theory.md`

Add a header note at the top:

> **Superseded 2026-04-25.** See
> [`docs/design-system.md`](../design-system.md) for the current
> doctrine. The principles in this document remain accurate as
> *founding theory* but the explicit rejections of glass and
> multiple radii have been replaced by the codified rules in the
> current doctrine. This file is retained as reference for the
> reasoning behind the original task-first frame.

---

## Verification

This is a doctrine + small-fix-list spec, not a feature build. The
verification model is:

1. **Doc review.** A second reader can read the updated
   `design-system.md` and predict the visual + control behavior of
   the customer surface without opening any component file. If they
   can't, the doc has a gap.
2. **Code review.** Each item in the code-change list above is its
   own commit. The reviewer confirms each commit matches the
   doctrine rule it cites.
3. **Touch test.** Re-run the manual "touch every interactive
   surface" walk on a deploy preview, mobile viewport (375 × 812).
   The audit findings catalogued in this conversation should be
   gone:
   - Stepper rapid-fire +5 → 5 (not 1)
   - Stepper accepts > 999 → clamps with visible feedback
   - Tap-outside FamilySheet closes it
   - Date control has hover affordance
   - Search wrapper has hover affordance
   - Disabled stepper button shows `cursor: not-allowed`
   - Tab-order has no phantom focusable
   - Active-tile state is one weight
   - Cart bar uses neutral `surfaceOverlay` (no primary tint)
   - All radii are `rounded-xl` or `rounded-full` (no other values
     visible on the customer surface)
   - All product tiles (usuals, FamilySheet, search) show a
     floating-pill stepper overlaying the image, with no tile-height
     change

4. **Static checks.** `npm run typecheck`, `npm run lint`,
   `npm run test`, `npm run build` clean.

A second pass on this doctrine will be triggered when the next
non-trivial customer-surface feature ships and the doctrine encounters
something it doesn't address.

---

## Risks

- **Per-tile stepper changes the visual rhythm of the FamilySheet
  grid.** The current grid has 5 tiles per desktop row; with a stepper
  pill overlaying each, the bottom of every tile carries control
  weight. Without real packaging photos, this won't feel right yet
  — but the doctrine's directive (image-first) plus real images
  should resolve it.
- **One-tap add inside FamilySheet may be too aggressive.** Customers
  browsing might tap the pill thinking they're "selecting" the
  product to view, not committing a quantity. Mitigation: the popout
  stays available via tap-image. If real-world feedback shows
  confusion, the doctrine returns to discussion.
- **The doctrine bans gradients.** If the page-level visual reads as
  too plain without the floating-glass surfaces, this rule re-opens
  for review — but only with a specific proposal, not generic
  "let's add visual interest."
- **`surfaceOverlayPrimary` becomes deprecated but still exported.**
  Some future contributor may consume it not knowing the cart-bar
  decision. Mitigation: JSDoc comment + the rule is enforced in
  review.
