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
