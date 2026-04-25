# ST-9 Portal Design Theory

> **Superseded 2026-04-25.** See [`docs/design-system.md`](../design-system.md) for the current doctrine. The principles in this document remain accurate as *founding theory*, but the explicit rejections of glass and multiple radii have been replaced by the codified rules in the current doctrine. This file is retained as reference for the reasoning behind the original task-first frame.

Supersedes [st-9-design-directives-round-2.md](st-9-design-directives-round-2.md) for portal surfaces.

## Core identity

The portal is a **recurring operational tool** for a store operator who reorders weekly from a phone. It is not a shopping destination. Every screen should collapse toward that identity.

## Operating principle

**Object-first, form-grade, one figure per screen.**

- **Object-first** (Victor, Thimbleby): the things the user already knows *are* the canvas. Verbs emerge contextually. Usuals dominate; browse is an escape hatch.
- **Form-grade density** (Shneiderman, direct manipulation): rows, steppers, inline edits. No cards, heroes, or accordions for re-provisioning.
- **One figure per screen** (Arnheim, figure/ground): exactly one region competes for attention. Everything else is ground.
- **Task primacy** (Cooper): secondary affordances demote visually, not just spatially.
- **Minimal persistent modes** (Tesler): at most two fixed edges — top chrome, bottom commitment. No stacking sticky rails.

## What changes

### Global shell
- Single column, `max-w-3xl` (768px), applied uniformly to topbar, main, every overlay, every sticky bar.
- Brand link demotes to `text-sm text-muted-foreground`. Chrome, not figure.
- Account icon only, no "Signed in as…" narration.
- No backdrop-blur anywhere. Solid `bg-background` + 1px border.
- Typography: body `text-sm`; section labels `text-xs font-semibold uppercase tracking-wide text-muted-foreground`. No `text-h3` in portal.
- One border radius: `rounded-md`.
- Accent color reserved for committing actions (Review, Submit) and active qty state.

### Order builder
- Pallet dock + dropdown: **deleted**. Pallets become one muted inline row at top, or render as regular rows when expanded.
- Usuals: bare form rows, no heading, no brand pills, no thumbnails. Stepper pre-filled with `typicalQty`.
- Browse-all: demoted to `Add something else →` escape hatch below usuals.
- Search + filters: removed from page body; search lives in topbar as a mode.
- Cart bar: flush on mobile, inline at page end on desktop (not sticky on desktop).
- Review: dedicated `/review` page, not an overlay.

### Landing
- Primary CTA is the next-available date as a button, not a picker. Secondary link opens the picker.
- Draft-resume banner is above but visually quieter than the primary CTA.

### Past orders
- Dense one-line-per-order table. "Reorder this" one-tap per row.

### Account
- Flat form, no tabs. Explicit save at bottom, no autosave.

## Theoretical sources

- Shneiderman, B. (1983). *Direct Manipulation: A Step Beyond Programming Languages*. IEEE Computer 16(8).
- Shneiderman, B. (1996). *The Eyes Have It: A Task by Data Type Taxonomy*.
- Cooper, A., Reimann, R., Cronin, D., & Noessel, C. (2014). *About Face* (4th ed.). Wiley.
- Norman, D. A. (2013). *The Design of Everyday Things* (rev. ed.). Basic Books.
- Arnheim, R. (1974). *Art and Visual Perception*. UC Press.
- Tesler, L. (2012). *The Law of the Conservation of Complexity*.
- Victor, B. (2011). *A Brief Rant on the Future of Interaction Design*.
- Thimbleby, H. (2007). *Press On*. MIT Press.

## What this explicitly rejects

- Catalog/e-commerce grammar (cards, heroes, hero imagery, promotional rails) for re-provisioning tasks.
- Glass morphism (`/95` + `backdrop-blur`) as decoration without information.
- Multiple simultaneous accent affordances — signals nothing when everything is bright.
- Decorative icons (Sparkles, Package fallbacks, etc.).
- Layered sticky surfaces competing for the top edge.
