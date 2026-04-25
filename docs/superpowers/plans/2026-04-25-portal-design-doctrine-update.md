# Portal Design Doctrine Update — Implementation Plan

> **Shipped 2026-04-25; Tasks 6, 15, 17 partially superseded.** This plan executed against the doctrine spec and the customer surface now reflects Rules 1–8 and 10–11. The surface-system rebuild that immediately followed (see [`2026-04-25-surface-system-rebuild.md`](./2026-04-25-surface-system-rebuild.md)) replaced the cart bar from Task 6 with `<CartReviewSurface>`, replaced the `<SurfaceHeader>`/`<SurfaceFooter>` primitives Task 15 documented with `Panel.Header`/`Panel.Footer` slots, and replaced the three modal primitives Task 17 codified with three Panel variants. References below to `<SurfaceHeader>`, `<SurfaceFooter>`, `<CartSummaryBar>`, `<ReviewOrderSheet>`, `surfaceOverlay`, `surfaceOverlayPrimary`, and `surfaceFloating` are historical — those primitives and tokens were deleted in the rebuild. Read [`docs/design-system.md`](../../design-system.md) for the current state. This file is retained as the implementation record.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the customer portal surface into compliance with the doctrine in `docs/superpowers/specs/2026-04-25-portal-design-doctrine-update-design.md`, then publish the doctrine itself in `docs/design-system.md`.

**Architecture:** A bounded set of code edits (rename a prop, switch a token, drop a tint, fix five real bugs) plus two documentation files. The single biggest change is Rule 4: every product tile across usuals / FamilySheet / inline-search-results becomes an image with a floating dug-in pill stepper overlay, replacing the current "image + bordered bar below" pattern. Each task is small, self-contained, and committed independently.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS, Radix UI primitives (`Dialog`, `Sheet`), Vitest, Playwright.

---

## File map

Authoritative list of every file this plan creates or modifies. If a task changes a file not on this list, that's a sign the plan is wrong.

| Path | Action | What it owns |
|---|---|---|
| `lib/design/surfaces.ts` | MODIFY | Material tokens. Add deprecation comment to `surfaceOverlayPrimary`. |
| `components/ui/stepper.tsx` | MODIFY | Canonical Stepper. Rapid-fire fix, max-cap, disabled cursor. |
| `components/catalog/product-tile.tsx` | MODIFY | Tile primitive. Rename `footerSlot` → `overlaySlot`, render slot as floating overlay, soften active-tile border. |
| `components/catalog/usual-row.tsx` | MODIFY | Consume `overlaySlot` instead of `footerSlot`. |
| `components/catalog/family-sheet.tsx` | MODIFY | New `onSetQuantity` prop. Pass `overlaySlot` to `<ProductTile>`. |
| `components/catalog/inline-search-results.tsx` | MODIFY | New `onSetQuantity` prop. Pass `overlaySlot` to `<ProductTile>`. |
| `components/catalog/order-builder.tsx` | MODIFY | Pass `setProductQuantity` into `FamilySheet` and `InlineSearchResults`. Add `hover:bg-background/80` to page-search wrapper. |
| `components/catalog/product-popout.tsx` | MODIFY | `rounded-3xl` → `rounded-xl`. Inner photo `rounded-2xl` → `rounded-xl`. |
| `components/catalog/review-order-sheet.tsx` | MODIFY | `rounded-(t-)2xl` → `rounded-(t-)xl`. |
| `components/catalog/cart-summary-bar.tsx` | MODIFY | Drop `surfaceOverlayPrimary` and `border-primary/20` for `surfaceOverlay`. |
| `components/catalog/editable-delivery-date.tsx` | MODIFY | Add `hover:bg-muted` to display button. |
| `tests/unit/stepper.test.tsx` | CREATE | Vitest tests for rapid-fire, max-cap, disabled state. |
| `docs/design-system.md` | MODIFY | Append material tokens, primitives, doctrine sections. Update Modals + Buttons sections. |
| `docs/archive/st-9-portal-design-theory.md` | MODIFY | Add "Superseded" header. |

Files **not** on this list and explicitly out of scope: any admin-facing component, any API route, any database migration, any scripts file, anything under `app/`.

---

## Task 1: Add JSDoc deprecation note to `surfaceOverlayPrimary`

**Files:**
- Modify: `lib/design/surfaces.ts`

The cart bar drops the primary tint (Rule 6). The token itself stays exported because removing it would be a breaking change to anything else that consumes it; instead we mark it deprecated for the customer surface so future contributors don't reach for it.

- [ ] **Step 1: Replace the `surfaceOverlayPrimary` export with a JSDoc-tagged version**

Open `lib/design/surfaces.ts`. Replace lines 29–30:

```ts
export const surfaceOverlayPrimary =
  'bg-primary/10 backdrop-blur-md border border-primary/20'
```

with:

```ts
/**
 * @deprecated for customer-surface use as of 2026-04-25.
 * The cart bar previously used this token; per doctrine Rule 6 (one
 * primary-tinted affordance per region), the cart bar now uses
 * `surfaceOverlay` and the accent Review button is the single signal.
 * Do not adopt this token for new customer-surface chrome.
 */
export const surfaceOverlayPrimary =
  'bg-primary/10 backdrop-blur-md border border-primary/20'
```

- [ ] **Step 2: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: clean — no errors. The JSDoc comment doesn't affect types.

- [ ] **Step 3: Commit**

```bash
git add lib/design/surfaces.ts
git commit -m "design: deprecate surfaceOverlayPrimary for customer surface (Rule 6)"
```

---

## Task 2: Stepper rapid-fire fix (functional update form)

**Files:**
- Modify: `components/ui/stepper.tsx`
- Test: `tests/unit/stepper.test.tsx`

Audit finding: clicking + 5 times within 100ms registers as +1. Each click reads the same stale `quantity` from props. Fix: keep an internal "pending value" so synchronous clicks accumulate locally and the parent receives the final value via the existing `onChange`.

The shape of the fix: introduce a local `valueRef` that mirrors `quantity` but updates synchronously inside `setNext`. The next click reads `valueRef.current`, not the stale closure-captured `quantity`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/stepper.test.tsx` with this exact content:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Stepper } from '@/components/ui/stepper'

describe('Stepper', () => {
  it('handles rapid-fire + clicks without stale-closure loss', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Stepper quantity={0} onChange={onChange} />)
    const plus = screen.getByRole('button', { name: /increase/i })
    // Five fast clicks.
    await user.click(plus)
    await user.click(plus)
    await user.click(plus)
    await user.click(plus)
    await user.click(plus)
    // The component reads from a ref that updates synchronously inside the
    // handler, so all five clicks accumulate even when the parent hasn't
    // re-rendered yet.
    expect(onChange).toHaveBeenCalledTimes(5)
    expect(onChange).toHaveBeenLastCalledWith(5)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/stepper.test.tsx`
Expected: FAIL — last call is with `1`, not `5`. (The test runner may also report missing `@testing-library/react` or `@testing-library/user-event`. Check those before continuing.)

If `@testing-library/react` or `@testing-library/user-event` aren't installed, install them:

```bash
npm install --save-dev @testing-library/react @testing-library/user-event
```

Then re-run the test. Expected: still FAIL on the assertion, not on imports.

- [ ] **Step 3: Implement the fix in `components/ui/stepper.tsx`**

Replace the entire file content with:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { surfaceFloatingRecessed } from '@/lib/design/surfaces'

interface StepperProps {
  quantity: number
  onChange: (next: number) => void
  min?: number
  /**
   * Hard cap for both stepper increments and the editable input. Defaults
   * to 999 — any larger value is clamped on commit. Set higher only with
   * a domain reason.
   */
  max?: number
  // Visual size. `sm` for inline grid/list contexts (h-9), `md` for the
  // popout (h-10). Both render the same dug-in pill — only the metrics
  // differ.
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}

const DEFAULT_MAX = 999

// Canonical stepper used everywhere on the customer surface. A single pill
// "dug into" the surrounding glass with an inset shadow, holding −, an
// editable number, and +. Tap-to-type the number for bulk entry; − / +
// nudge by one.
//
// Rapid-fire clicks: handlers read the latest committed value from a ref,
// not the closure-captured `quantity` prop, so multiple synchronous clicks
// accumulate correctly even before the parent re-renders.
//
// Clamp: values above `max` are clamped on commit. The user sees their
// typed value momentarily, then it snaps to the cap on blur or Enter.
export function Stepper({
  quantity,
  onChange,
  min = 0,
  max = DEFAULT_MAX,
  size = 'sm',
  className,
  ariaLabel = 'Quantity',
}: StepperProps) {
  const [draft, setDraft] = useState(String(quantity))
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Mirrors the latest committed value so rapid clicks don't read a stale
  // `quantity` prop. Updated synchronously inside setNext.
  const valueRef = useRef<number>(quantity)

  useEffect(() => {
    valueRef.current = quantity
    setDraft(String(quantity))
  }, [quantity])

  const setNext = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next))
    valueRef.current = clamped
    setDraft(String(clamped))
    onChange(clamped)
  }

  const commitDraft = () => {
    const parsed = Number.parseInt(draft, 10)
    const next = Number.isFinite(parsed) ? parsed : min
    const clamped = Math.min(max, Math.max(min, next))
    setDraft(String(clamped))
    if (clamped !== valueRef.current) {
      valueRef.current = clamped
      onChange(clamped)
    } else if (next !== clamped) {
      // Typed value was out of range; snap visible draft back even if no
      // onChange fires (parent already has the canonical value).
      setDraft(String(clamped))
    }
  }

  const dim = size === 'md' ? 'h-10 w-10' : 'h-9 w-9'
  const inputDim = size === 'md' ? 'h-10 w-10 text-base' : 'h-9 w-10 text-sm'

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full',
        surfaceFloatingRecessed,
        className,
      )}
    >
      <button
        type="button"
        aria-label={`${ariaLabel}: decrease`}
        className={cn(
          'flex flex-none items-center justify-center rounded-full transition',
          'hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          dim,
        )}
        onClick={() => setNext(valueRef.current - 1)}
        disabled={valueRef.current <= min}
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(event) => {
          const cleaned = event.target.value.replace(/[^0-9]/g, '')
          setDraft(cleaned)
        }}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitDraft()
            inputRef.current?.blur()
          }
        }}
        aria-label={ariaLabel}
        className={cn(
          'min-w-0 bg-transparent text-center font-semibold tabular-nums',
          'focus:outline-none',
          inputDim,
        )}
      />
      <button
        type="button"
        aria-label={`${ariaLabel}: increase`}
        className={cn(
          'flex flex-none items-center justify-center rounded-full transition',
          'hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          dim,
        )}
        onClick={() => setNext(valueRef.current + 1)}
        disabled={valueRef.current >= max}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the rapid-fire test to verify it passes**

Run: `npx vitest run tests/unit/stepper.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add a max-cap test to the same file**

Append to `tests/unit/stepper.test.tsx`:

```tsx
  it('clamps typed input above max on commit', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Stepper quantity={5} onChange={onChange} max={999} />)
    const input = screen.getByRole('textbox', { name: /quantity/i })
    await user.click(input)
    await user.tripleClick(input)
    await user.keyboard('99999')
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith(999)
  })

  it('clamps typed input below min on commit', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Stepper quantity={5} onChange={onChange} min={0} />)
    const input = screen.getByRole('textbox', { name: /quantity/i })
    await user.click(input)
    await user.tripleClick(input)
    await user.keyboard('abc')
    await user.tab()
    // Letters are stripped on input; commit treats empty as `min`.
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('disables minus at min and plus at max', () => {
    render(<Stepper quantity={0} onChange={() => {}} min={0} max={5} />)
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /increase/i })).not.toBeDisabled()
  })
```

- [ ] **Step 6: Run the full stepper test file to verify all four tests pass**

Run: `npx vitest run tests/unit/stepper.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 7: Commit**

```bash
git add components/ui/stepper.tsx tests/unit/stepper.test.tsx
git commit -m "fix(stepper): rapid-fire accumulation, max clamp, disabled cursor

- Use valueRef so synchronous + clicks accumulate before parent re-render.
- Clamp typed input to [min, max], default max=999.
- Add disabled:cursor-not-allowed (Rule 8).
- Add Vitest coverage for rapid-fire, clamp, and disabled state."
```

---

## Task 3: Rename `footerSlot` → `overlaySlot` and render as floating overlay (Rule 4)

**Files:**
- Modify: `components/catalog/product-tile.tsx`
- Modify: `components/catalog/usual-row.tsx`

The current `<ProductTile footerSlot={…}>` renders the slot as a bordered bar below the image. Per Rule 4, the slot becomes a floating overlay anchored to the bottom-center of the image; the image stays full-bleed and the tile does not grow vertically.

Both `product-tile.tsx` and `usual-row.tsx` change in the same commit because the rename is breaking and they're the only two consumers in this task.

This task ALSO implements Rule 7 (single-weight active tile state — drop the ring).

- [ ] **Step 1: Replace `components/catalog/product-tile.tsx` with the new contract**

Open `components/catalog/product-tile.tsx` and replace the entire file with:

```tsx
'use client'

import Image from 'next/image'
import type { CatalogProduct } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ProductTileProps {
  product: CatalogProduct
  quantity: number
  onOpen: () => void
  /**
   * Optional control overlay anchored bottom-center of the image. Renders
   * as a floating element — does NOT extend the tile height. The image
   * fills the entire card and remains visible behind/around the overlay.
   *
   * Used by surfaces (usuals, FamilySheet tiles, inline-search-results)
   * that surface the Stepper inline so reorders are a single tap.
   */
  overlaySlot?: React.ReactNode
}

// Image-first product tile. The image fills the entire card edge-to-edge.
// When `overlaySlot` is provided, its content floats over the bottom of
// the image without resizing the tile (Rule 4).
//
// Active-cart state (quantity > 0): a single primary border at full
// opacity (Rule 7). No ring; no double-weight signal.
export function ProductTile({
  product,
  quantity,
  onOpen,
  overlaySlot,
}: ProductTileProps) {
  const brandName = product.brand?.name ?? null
  const thumbSrc = product.image_url ?? null
  const hasQty = quantity > 0
  const ariaLabel = [brandName, product.title, hasQty ? `qty ${quantity}` : null]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className={cn(
        'relative aspect-[4/5] w-full overflow-hidden rounded-xl border bg-card shadow-sm transition',
        'hover:shadow-md',
        hasQty ? 'border-primary' : 'border-border',
      )}
    >
      {thumbSrc ? (
        <Image
          src={thumbSrc}
          alt=""
          fill
          sizes="(min-width: 1024px) 12vw, (min-width: 640px) 18vw, 33vw"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/40 p-3">
          <span className="line-clamp-4 text-center text-sm font-bold leading-tight text-muted-foreground">
            {product.title}
          </span>
        </div>
      )}

      {/* Open-target — full tile. Sits beneath the qty badge and overlay
          so taps on chrome don't bubble through. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel || product.title}
        className="absolute inset-0 z-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      />

      {/* Top-right qty badge — floats over the image. */}
      {hasQty && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 z-20 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary/90 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground shadow-md backdrop-blur-sm"
        >
          {quantity}
        </span>
      )}

      {/* Floating control overlay. Anchored bottom-center, breathing room
          inset on both sides + bottom (`inset-x-3 bottom-3`). Image
          continues behind/around the overlay. */}
      {overlaySlot && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex justify-center">
          <div className="pointer-events-auto">{overlaySlot}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `components/catalog/usual-row.tsx` to use `overlaySlot`**

Open `components/catalog/usual-row.tsx`. Replace the file contents with:

```tsx
'use client'

import { ProductTile } from '@/components/catalog/product-tile'
import { Stepper } from '@/components/ui/stepper'
import type { CatalogProduct } from '@/lib/types'

export interface UsualRowProps {
  product: CatalogProduct
  quantity: number
  onChange: (next: number) => void
  onOpen: () => void
  // Kept on the prop surface for API symmetry — pricing lives in the popout.
  showPrices: boolean
}

// Usuals variant of the ProductTile: the image fills the entire card,
// the Stepper overlays the bottom as a floating dug-in pill (Rule 4).
// Tapping anywhere on the image (outside the pill) opens the popout for
// full details.
export function UsualRow({ product, quantity, onChange, onOpen }: UsualRowProps) {
  return (
    <ProductTile
      product={product}
      quantity={quantity}
      onOpen={onOpen}
      overlaySlot={<Stepper quantity={quantity} onChange={onChange} />}
    />
  )
}
```

- [ ] **Step 3: Run typecheck to verify no other consumers reference the old prop name**

Run: `npm run typecheck`
Expected: clean. If a consumer still references `footerSlot`, the typecheck will surface it — that consumer must be updated in this commit too. (Tasks 4 and 5 introduce new consumers; they use the new name from the start.)

- [ ] **Step 4: Run the dev server and visually confirm the usuals tile shows a floating pill, not a bordered footer**

```bash
npm run dev
```

Open the portal customer order page. The Cherry Coke and Coke usuals tiles should show:
- Image fills the entire tile (or the title-as-poster fallback when no image)
- A floating dug-in stepper pill anchored near the bottom of the image, centered horizontally, with breathing room on both sides
- No bordered bar; tile height unchanged from before

If the visual doesn't match, the layout needs adjustment before continuing.

- [ ] **Step 5: Commit**

```bash
git add components/catalog/product-tile.tsx components/catalog/usual-row.tsx
git commit -m "design(tiles): rename footerSlot → overlaySlot, floating pill (Rule 4 + Rule 7)

- ProductTile renders overlaySlot as a floating element anchored
  bottom-center of the image; image stays full-bleed, tile does not
  grow vertically.
- UsualRow consumes the new contract directly.
- Active-cart state simplified to a single primary border (drop ring,
  Rule 7)."
```

---

## Task 4: Stepper overlay on FamilySheet tiles (Rule 4)

**Files:**
- Modify: `components/catalog/family-sheet.tsx`
- Modify: `components/catalog/order-builder.tsx`

FamilySheet currently renders `<ProductTile>` with no stepper. Add an `onSetQuantity` prop to FamilySheet, and inside the tile loops, pass `overlaySlot={<Stepper …/>}` to each `<ProductTile>`. The OrderBuilder side already has `setProductQuantity`; just thread it through.

- [ ] **Step 1: Add the `onSetQuantity` prop to FamilySheet**

Open `components/catalog/family-sheet.tsx`. The `FamilySheetProps` interface lives near the top (around lines 29–35 — confirm by reading the file). Add `onSetQuantity` after `onOpenProduct`:

```ts
interface FamilySheetProps {
  state: FamilySheetMode
  onStateChange: (next: FamilySheetMode) => void
  products: CatalogProduct[]
  quantityFor: (product: CatalogProduct) => number
  onOpenProduct: (product: CatalogProduct) => void
  onSetQuantity: (product: CatalogProduct, next: number) => void
}
```

Add `onSetQuantity` to the destructured args of `FamilySheet({…})`.

Also import the Stepper at the top of the file:

```tsx
import { Stepper } from '@/components/ui/stepper'
```

- [ ] **Step 2: Pass `overlaySlot` to every `<ProductTile>` inside FamilySheet's tile renders**

There are three `<ProductTile>` call sites inside `family-sheet.tsx`: the size-brand grouping (inside `useNestedSizeBrand && sizeBrandGroups.length > 0`), the brand-led grouping (`!useNestedSizeBrand && brandGroups.length > 0`), and the search-mode results (`isSearchMode && searchSections.length > 0`).

For each `<ProductTile>` JSX block, add the `overlaySlot` prop. Example for the size-brand block:

```tsx
<ProductTile
  key={product.id}
  product={product}
  quantity={quantityFor(product)}
  onOpen={() => onOpenProduct(product)}
  overlaySlot={
    <Stepper
      quantity={quantityFor(product)}
      onChange={(next) => onSetQuantity(product, next)}
    />
  }
/>
```

Apply the same `overlaySlot` prop to the brand-led grouping block and to the search-mode block. Do NOT add `overlaySlot` anywhere outside `<ProductTile>` JSX.

- [ ] **Step 3: Update the call site in `order-builder.tsx` to pass `onSetQuantity`**

Open `components/catalog/order-builder.tsx`. Find the `<FamilySheet …/>` JSX (around line 300). Add the `onSetQuantity` prop:

```tsx
<FamilySheet
  state={sheetState}
  onStateChange={setSheetState}
  products={products}
  quantityFor={(product) => quantities[productKey(product.id)] ?? 0}
  onOpenProduct={(product) => setOpenProductId(product.id)}
  onSetQuantity={setProductQuantity}
/>
```

`setProductQuantity` already exists in OrderBuilder and matches the `(product, next) => void` signature.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Run the dev server and visually verify the FamilySheet tiles**

```bash
npm run dev
```

Open the portal, click any FamilyCard (e.g. Soda) to open the FamilySheet. Each product tile in the grid should show:
- Image fills the tile
- A floating Stepper pill near the bottom, identical to usuals
- Tapping − or + changes the quantity and updates the cart bar
- Tapping the image area (not the pill) opens the popout

If the pill looks wrong (overlapping the image too much, off-center, or extending the tile height), revisit Task 3's `overlaySlot` rendering before continuing.

- [ ] **Step 6: Commit**

```bash
git add components/catalog/family-sheet.tsx components/catalog/order-builder.tsx
git commit -m "design(family-sheet): floating Stepper overlay on every tile (Rule 4)

FamilySheet gains onSetQuantity prop; each ProductTile inside the
size-brand, brand-led, and search-mode grids receives an overlaySlot
with a Stepper. One-tap add applies to family browsing the same way
it does to usuals."
```

---

## Task 5: Stepper overlay on inline-search-results (Rule 4)

**Files:**
- Modify: `components/catalog/inline-search-results.tsx`
- Modify: `components/catalog/order-builder.tsx`

Same pattern as Task 4, applied to the inline search results component.

- [ ] **Step 1: Add `onSetQuantity` to `InlineSearchResults`**

Open `components/catalog/inline-search-results.tsx`. Update the props interface and destructured args:

```tsx
interface InlineSearchResultsProps {
  query: string
  products: CatalogProduct[]
  quantityFor: (product: CatalogProduct) => number
  onOpenProduct: (product: CatalogProduct) => void
  onSetQuantity: (product: CatalogProduct, next: number) => void
}

// …

export function InlineSearchResults({
  query,
  products,
  quantityFor,
  onOpenProduct,
  onSetQuantity,
}: InlineSearchResultsProps) {
```

Add the Stepper import at the top:

```tsx
import { Stepper } from '@/components/ui/stepper'
```

- [ ] **Step 2: Pass `overlaySlot` to the `<ProductTile>` inside the section render**

Replace the `<ProductTile>` JSX inside `section.products.map(...)` with:

```tsx
<ProductTile
  key={product.id}
  product={product}
  quantity={quantityFor(product)}
  onOpen={() => onOpenProduct(product)}
  overlaySlot={
    <Stepper
      quantity={quantityFor(product)}
      onChange={(next) => onSetQuantity(product, next)}
    />
  }
/>
```

- [ ] **Step 3: Update the call site in `order-builder.tsx`**

Open `components/catalog/order-builder.tsx`. Find the `<InlineSearchResults …/>` JSX (in the `isSearching` branch, around line 251). Add `onSetQuantity`:

```tsx
<InlineSearchResults
  query={pageQuery}
  products={products}
  quantityFor={(product) => quantities[productKey(product.id)] ?? 0}
  onOpenProduct={(product) => setOpenProductId(product.id)}
  onSetQuantity={setProductQuantity}
/>
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Visually verify in dev**

In the running dev server, type "diet" into the page-level search input. The result tiles should each show a floating Stepper pill identical to usuals and FamilySheet. Tapping +/− changes the cart, tapping the image opens the popout.

- [ ] **Step 6: Commit**

```bash
git add components/catalog/inline-search-results.tsx components/catalog/order-builder.tsx
git commit -m "design(search): floating Stepper overlay on inline-search tiles (Rule 4)"
```

---

## Task 6: Cart bar drops primary tint (Rule 6)

**Files:**
- Modify: `components/catalog/cart-summary-bar.tsx`

The cart bar currently uses `surfaceOverlayPrimary` plus a `border-primary/20`. Per Rule 6, the cart bar reverts to the neutral `surfaceOverlay` material; the accent Review button is the single signal that an order is in progress.

- [ ] **Step 1: Update `components/catalog/cart-summary-bar.tsx`**

Replace the file contents with:

```tsx
'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import { surfaceOverlay } from '@/lib/design/surfaces'

interface CartSummaryBarProps {
  itemCount: number
  totalValue: number
  showPrices: boolean
  onReview: () => void
}

// Fixed-bottom cart summary.
//   - Mobile: edge-to-edge band pinned to the bottom of the viewport.
//   - Desktop (md+): floating pill, max-width matching the page content
//     container so the bar visually aligns with the page's logo + profile.
//
// Per doctrine Rule 6: the bar uses neutral `surfaceOverlay`. The accent
// Review button is the single primary affordance — no double-tinting.
export function CartSummaryBar({
  itemCount,
  totalValue,
  showPrices,
  onReview,
}: CartSummaryBarProps) {
  if (itemCount === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-0 md:bottom-4 md:px-4">
      <div
        className={cn(
          'mx-auto flex items-center justify-between gap-3 p-3',
          // Desktop: pill — rounded-full, contained max-width, soft drop shadow.
          'md:max-w-3xl md:rounded-full md:px-5 md:py-2.5 md:shadow-2xl',
          surfaceOverlay,
        )}
      >
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
          {showPrices && (
            <span className="font-semibold tabular-nums text-foreground/80">
              {formatCurrency(totalValue)}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="accent"
          size="sm"
          onClick={onReview}
          className="gap-1.5"
        >
          Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Visually verify in dev**

The cart bar (with at least one item in the cart) should:
- On mobile: edge-to-edge at the bottom, neutral white-ish translucent material
- On desktop: a centered floating pill, max-width 768px, neutral material
- The Review button stays accent-colored (amber) — the single signal

The previous primary-blue tint should be gone.

- [ ] **Step 3: Commit**

```bash
git add components/catalog/cart-summary-bar.tsx
git commit -m "design(cart-bar): drop primary tint, use neutral surfaceOverlay (Rule 6)

Cart bar reverts to neutral glass; the accent Review button is the
single affordance per Rule 6 (one primary-tinted affordance per region)."
```

---

## Task 7: Corner-radius cleanup — popout (Rule 5)

**Files:**
- Modify: `components/catalog/product-popout.tsx`

The popout currently uses `rounded-3xl` on the `DialogContent` and `rounded-2xl` on the inner photo container. Per Rule 5, only `rounded-xl` (containers) and `rounded-full` (controls) are authorized.

- [ ] **Step 1: Update `components/catalog/product-popout.tsx`**

In the `<DialogContent>` `className`, change `rounded-3xl` to `rounded-xl`. The full className line should read:

```tsx
className={cn(
  // Override the shared dialog's `grid` display so the inner
  // aspect-square photo respects the capsule's stated width.
  'block w-[calc(100vw-1.5rem)] max-w-[22rem] gap-0 p-4',
  'max-h-[88dvh] overflow-y-auto rounded-xl',
  surfaceFloating,
  // Hide Radix's default X — tap-outside dismisses.
  '[&>button]:hidden',
)}
```

In the inner photo container `<div>`, change `rounded-2xl` to `rounded-xl`:

```tsx
<div className="relative aspect-square w-full overflow-hidden rounded-xl bg-background/40">
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Visually verify**

Open the popout in dev (tap any product tile). The corner radius should look snug and uniform — same scale as a FamilyCard, not the previous more-rounded look.

- [ ] **Step 4: Commit**

```bash
git add components/catalog/product-popout.tsx
git commit -m "design(popout): rounded-xl per doctrine Rule 5"
```

---

## Task 8: Corner-radius cleanup — review sheet (Rule 5)

**Files:**
- Modify: `components/catalog/review-order-sheet.tsx`

The review sheet uses `rounded-2xl` (desktop) and `rounded-t-2xl` (mobile). Per Rule 5, both become `rounded-xl` / `rounded-t-xl`.

- [ ] **Step 1: Update `components/catalog/review-order-sheet.tsx`**

Find the `DialogPrimitive.Content` className. Replace `rounded-t-2xl` with `rounded-t-xl` and `rounded-2xl` with `rounded-xl` (both occurrences). The relevant className segments are around the comments "Mobile: pinned bottom…" and "Desktop: contained…".

After the edit, the className should contain:

```tsx
'inset-x-0 bottom-0 h-[68dvh] rounded-t-xl border-t',
// …
'md:inset-x-4 md:bottom-4 md:mx-auto md:h-[68dvh] md:max-w-3xl md:rounded-xl md:border',
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Visually verify**

Open the review sheet in dev (tap Review on the cart bar). Corners should match the popout and tiles in scale.

- [ ] **Step 4: Commit**

```bash
git add components/catalog/review-order-sheet.tsx
git commit -m "design(review-sheet): rounded-xl per doctrine Rule 5"
```

---

## Task 9: Corner-radius audit pass

**Files:**
- (varies)

Per the spec: "search the customer surface for any other `rounded-2xl` / `rounded-3xl` / `rounded-md` not authorized by Rule 5; align to `rounded-xl` (containers) or `rounded-full` (controls)." This is the verification + cleanup step.

- [ ] **Step 1: Grep for unauthorized radii on customer-surface files**

Run from the repo root:

```bash
git grep -nE "rounded-(2xl|3xl|md)" -- 'components/catalog/*.tsx' 'components/portal/*.tsx' 'components/ui/sheet.tsx'
```

Record every hit. For each, decide:
- Is the element a **container**? → change to `rounded-xl`.
- Is the element a **control** (button, chip, pill)? → change to `rounded-full`.
- Is the file `components/ui/sheet.tsx` and the radius is part of the shared sheet primitive used by FamilySheet/Review? → leave it alone for now; FamilySheet/ReviewOrderSheet override it via className. But if it's a hard-coded `rounded-2xl` on `SheetContent`, change to `rounded-xl`.

- [ ] **Step 2: Edit any violations found**

For each violation in the grep output, edit the className. Example: if `editable-delivery-date.tsx` has `rounded-md` on the display button, change to `rounded-xl` (it's a container) or `rounded-full` (if it's intended as a pill — see existing context). Use the doctrine: container vs control.

If the only violation is `rounded-md` on a small `<input type="date">` in `editable-delivery-date.tsx`, that input is a control — change to `rounded-full` is wrong (date inputs visually need a rectangular shape). Compromise: it's an input control with a non-pill shape; change to `rounded-xl` and document inline that the doctrine treats date/text inputs as containers for radius purposes. Add a comment:

```tsx
// rounded-xl per doctrine Rule 5: text-style inputs are containers, not pills.
```

Apply the same reasoning to any other text-input element.

- [ ] **Step 3: Run typecheck and the customer-surface tests**

```bash
npm run typecheck
npx vitest run tests/unit
```

Both should pass.

- [ ] **Step 4: Commit**

```bash
git add -A components/catalog components/portal components/ui/sheet.tsx
git commit -m "design: corner-radius audit, align customer surface to Rule 5

Sweep customer-surface components for rounded-md/2xl/3xl violations
and bring all containers to rounded-xl, all pill controls to
rounded-full. Text-style inputs (e.g. editable-delivery-date) classed
as containers for radius purposes."
```

(If no violations were found in Step 1, skip Step 2 and 4. The grep output itself is the audit record.)

---

## Task 10: Hover affordance on the date control (Rule 8)

**Files:**
- Modify: `components/catalog/editable-delivery-date.tsx`

The date display button currently has no hover state. Per Rule 8, every clickable surface signals hover.

- [ ] **Step 1: Edit `components/catalog/editable-delivery-date.tsx`**

Find the display-mode button (the `<button type="button" onClick={beginEdit}>` near the bottom of the file). Update its className:

```tsx
<button
  type="button"
  onClick={beginEdit}
  className="group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-lg font-semibold leading-tight transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
  aria-label={`Change delivery date — currently ${formatDeliveryDate(deliveryDate)}`}
>
```

Note: the px/py is small but ensures the hover background has a visible footprint.

If Task 9 changed the button's radius to `rounded-xl` (per doctrine), use that instead of `rounded-md` here. (Read the file's current state before editing — Task 9's commit may already have updated it.)

- [ ] **Step 2: Visually verify**

Hover the date in the page header. The text should subtly tint with the muted background — same affordance as FamilyCards.

- [ ] **Step 3: Commit**

```bash
git add components/catalog/editable-delivery-date.tsx
git commit -m "design(date): hover affordance on display button (Rule 8)"
```

---

## Task 11: Hover affordance on the page-search wrapper (Rule 8)

**Files:**
- Modify: `components/catalog/order-builder.tsx`

The page-level search wrapper currently has no hover affordance. Per Rule 8, add one.

- [ ] **Step 1: Edit `components/catalog/order-builder.tsx`**

Find the page-level search wrapper (`<div>` containing the `<Search>` icon and the `<input type="text">` placeholder "Search products"). It's around line 224. Update its className to include `transition-colors hover:bg-background/80`:

```tsx
<div
  className={cn(
    'flex items-center gap-2 rounded-full px-4 py-2.5 shadow-sm transition-colors hover:bg-background/80',
    surfaceFloating,
  )}
>
```

- [ ] **Step 2: Visually verify**

Hover the page-search input wrapper. The background should subtly shift — signaling tap-affordance before the user clicks.

- [ ] **Step 3: Commit**

```bash
git add components/catalog/order-builder.tsx
git commit -m "design(page-search): hover affordance on wrapper (Rule 8)"
```

---

## Task 12: FamilySheet tap-outside-to-close (Tier 1 audit bug)

**Files:**
- Modify: `components/catalog/family-sheet.tsx`

The audit found that tapping outside the FamilySheet does NOT close it (only ESC does). The Radix `Sheet` primitive supports `onOpenChange`, which is wired correctly via `onStateChange`. Investigation: the SheetContent's `onPointerDownOutside` may be hijacked by an inner element, or the overlay isn't catching the tap. Most likely: the sheet's content is `flex h-[92dvh]` and absorbs the click before the overlay fires.

The simplest defense-in-depth fix is to ensure the Radix overlay-click flows correctly. We do this by using `<SheetOverlay>` explicitly (today FamilySheet uses `<SheetContent>` which renders its own portal; verify the overlay is wired and not being prevented).

- [ ] **Step 1: Read the current FamilySheet structure to locate the SheetContent**

Run:

```bash
git grep -n "SheetContent" components/catalog/family-sheet.tsx
```

Look at the `<SheetContent …>` element. By default Radix `Sheet` automatically dismisses on overlay click via `onOpenChange(false)` — and the `onOpenChange` IS wired to `onStateChange({ mode: 'closed' })` via the existing `onOpenChange` prop on the outer `<Sheet>`.

The likely culprit: the audit may have observed the click hitting the FamilySheet content (because the sheet covers 92dvh of viewport) rather than the overlay. Test this hypothesis by clicking the small portion of viewport NOT covered by the sheet (the sliver above the sheet's top edge).

- [ ] **Step 2: Confirm the fix is actually needed**

Run `npm run dev`, open a FamilySheet, and click the sliver above the sheet's top edge. If the sheet closes, this task is **already correct** — the original audit click was inside the sheet's content area, which is correct behavior (taps inside the sheet shouldn't close it). Mark this task complete with no code change and continue.

If the sheet does NOT close even when clicking outside its visible area, proceed to Step 3.

- [ ] **Step 3: If needed, force overlay click handling**

If Step 2 confirms the bug, edit `components/catalog/family-sheet.tsx`. Find the `<Sheet open={isOpen} onOpenChange={onOpenChange}>` (around line 223). The `onOpenChange` prop receives a boolean from Radix; the current implementation maps it via:

```tsx
const onOpenChange = (next: boolean) => {
  if (!next) onStateChange({ mode: 'closed' })
}
```

Verify this function exists and is wired. If it is, Radix should be calling it on overlay click. If it isn't being called, add an explicit `<SheetOverlay onClick={() => onStateChange({ mode: 'closed' })}>` inside the SheetContent — but this is not the default Radix shape, so prefer the `onOpenChange` route first.

If after investigation the overlay click is genuinely not propagating, the root cause is likely the `[&>button]:hidden` className stopping pointer events on the X close. Document the finding in the commit message.

- [ ] **Step 4: Commit (only if a code change was needed)**

```bash
git add components/catalog/family-sheet.tsx
git commit -m "fix(family-sheet): ensure tap-outside dismisses the sheet"
```

If no change was needed, skip the commit and add a note in the next task's commit body explaining the observed behavior.

---

## Task 13: Page-level static checks pass

**Files:**
- (verification only — no edits expected)

Before publishing the documentation, confirm the customer surface compiles, lints, tests, and builds clean.

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS. Pre-existing warnings (unused vars in unrelated files) are acceptable; new warnings introduced by this plan's changes are not. Compare against the lint baseline before starting if uncertain.

- [ ] **Step 3: Run unit tests**

Run: `npm run test`
Expected: PASS, including the new stepper tests from Task 2.

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: PASS, output completes without errors.

- [ ] **Step 5: Rule 9 verification grep**

Run from the repo root:

```bash
git grep -nE "DialogContent" -- 'components/catalog/*.tsx' 'components/portal/*.tsx' | grep -E "(top-|left-|inset-)"
```

Expected output:
- The popout's `block w-[calc(100vw-1.5rem)]` line — sanctioned, this is the popout shape's official override.
- No other hits.

If any other hit appears, that's an ad-hoc dialog positioning that bypasses the Rule 9 shapes. Investigate and either revert to a sanctioned shape or surface as a doctrine question.

- [ ] **Step 6: If any of the above fail, debug and fix before proceeding**

Each failure points to a specific file in the plan's File map. Read the failure output carefully; do not introduce new files or changes outside the plan's scope. If a failure cannot be resolved within the plan's bounds, stop and surface the issue.

- [ ] **Step 7: Commit (only if a fix was needed)**

```bash
git add -A
git commit -m "fix: address typecheck/lint/test/build failures from doctrine pass"
```

---

## Task 14: Append "Material tokens" section to `docs/design-system.md`

**Files:**
- Modify: `docs/design-system.md`

Append a new section documenting the four `surface*` exports.

- [ ] **Step 1: Append the section**

Open `docs/design-system.md`. After the last existing section (which ends at the "Modals" or "Usage rules" section — confirm by reading), append:

```markdown
---

## Material tokens

Material tokens for glass surfaces. Defined in [`lib/design/surfaces.ts`](../lib/design/surfaces.ts). Composed by every glass-style component as its base; tweaks (corner radius, padding, ring) live on the component, not the recipe.

**`surfaceOverlay`** — `bg-background/80 backdrop-blur-md border border-foreground/10`. Anchored full-width chrome: cart bar, sheet headers/footers, top nav. Lives "on the page," lighter blur, semi-opaque so content reads through but the bar still feels solid.

**`surfaceFloating`** — `bg-background/60 backdrop-blur-2xl border border-white/40 shadow-2xl`. Detached focused object: popout capsule, search-trigger pill. Lifts off the page; heavier blur, subtle border highlight, soft drop shadow.

**`surfaceFloatingRecessed`** — `bg-foreground/10` plus an inset shadow recipe. Controls dug into a parent surface (the Stepper). Reads as a slot in the parent material.

**`surfaceOverlayPrimary`** — _Deprecated 2026-04-25_ for customer-surface use. Previously the cart-bar tint; per doctrine Rule 6 (one primary-tinted affordance per region), the cart bar now uses `surfaceOverlay`. Do not adopt for new customer-surface chrome.

Every glass surface picks one of the three active tokens. Anti-pattern: ad-hoc `bg-*/N backdrop-blur-*` declarations on individual components — that's how the four-recipe drift happened.
```

- [ ] **Step 2: Commit**

```bash
git add docs/design-system.md
git commit -m "docs(design-system): document material tokens"
```

---

## Task 15: Append "Primitives" section to `docs/design-system.md`

**Files:**
- Modify: `docs/design-system.md`

Document the new primitives that Plan C introduced.

- [ ] **Step 1: Append the section**

After the "Material tokens" section, append:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/design-system.md
git commit -m "docs(design-system): document Stepper, FilterChip, Surface primitives"
```

---

## Task 16: Append "Doctrine rules" section to `docs/design-system.md`

**Files:**
- Modify: `docs/design-system.md`

Append the 11 doctrine rules verbatim from the spec, with code-pointer footnotes.

- [ ] **Step 1: Append the section**

After "Primitives (post Plan-C)", append:

```markdown
---

## Doctrine rules (customer portal surface)

These rules are derived from `docs/superpowers/specs/2026-04-25-portal-design-doctrine-update-design.md`. Each carries a code-pointer footnote where applicable. The doctrine supersedes [`docs/archive/st-9-portal-design-theory.md`](archive/st-9-portal-design-theory.md).

**1. Object-first, form-grade, one figure per screen.** Usuals dominate; browse is the escape hatch. Rows, steppers, inline edits — no heroes, no marketing rails. Exactly one region competes for attention. Anti-pattern: a "deals carousel" or "featured products" rail on the order page.

**2. Glass material is reserved for surfaces that float over content.** Page itself is solid `bg-background`. Glass appears only on sheet overlays, the cart bar pill on desktop, the popout capsule, dug-in steppers, and floating overlays on tiles. Glass is always semantic. Anti-pattern: `backdrop-blur` on a section heading; gradients on the page background.

**3. The dug-in pill is the canonical control surface.** Single component (`<Stepper>`) used everywhere a product can be added — popout body and floating overlay on every product tile. Anti-pattern: custom outline-button stepper, reusing the dug-in pill for non-quantity inputs.

**4. Steppers on product tiles overlay the image as a floating glass pill.** Image fills the tile; the Stepper pill floats centered at the bottom (`inset-x-3 bottom-3`); tile does not grow vertically. See `<ProductTile overlaySlot={…}>`. Anti-pattern: a separate stepper bar that grows the tile height.

**5. Two corner-radius rules.** `rounded-xl` (12px) for containers; `rounded-full` for pill controls. No `rounded-md`, no `rounded-2xl`, no `rounded-3xl`. Text-style inputs (date, search) classed as containers for radius purposes. Anti-pattern: per-instance radius overrides.

**6. Accent reserved for committing.** Amber `accent` = Review, Submit. Primary navy = active state (qty badges, active filter chip). Within a single visible region, **at most one** affordance is tinted. The cart bar uses neutral `surfaceOverlay`; the accent Review button is the single signal. Anti-pattern: multiple primary-tinted affordances visible in the same region.

**7. Active state is single-weight.** `border-primary` (full opacity, 1px) on an active tile — no ring, no shadow stack. Anti-pattern: `border-primary/60 ring-1 ring-primary/40` (the previous double-weight pattern).

**8. Hover and focus signals are mandatory on every interactive surface.** Every clickable surface signals hover via `hover:bg-*` / `hover:border-*`. Every focusable surface uses `focus:outline-none focus:ring-2 focus:ring-ring`. Disabled elements: `disabled:opacity-40 disabled:cursor-not-allowed`. Anti-pattern: tap-to-discover affordances; pencil icons that signal interactivity without the underlying control also signaling it.

**9. Three modal shapes, no fourth.** `<Dialog>` for centered creation/input forms (sign-in, popout). `<AlertDialog>` for confirmations (delete prompts). `<Sheet side="bottom">` for panels (FamilySheet, ReviewOrderSheet). A new shape requires updating this doctrine. Anti-pattern: a custom-positioned `<Dialog>` overriding the shared shape.

**10. One simultaneous sticky surface.** At most one fixed-position element on top of the scroll content (the cart bar). When a sheet opens, the cart bar remains fixed underneath because it's still relevant. Anti-pattern: a sticky page header on top of the cart bar.

**11. Autosave or commit, never both.** Quantity changes autosave (300ms debounce via `useAutoSavePortal`). The order itself commits explicitly via Submit. The delivery date commits inline on Enter/blur — the same model. No "Save" button on the order page; no dirty-state banner.
```

- [ ] **Step 2: Commit**

```bash
git add docs/design-system.md
git commit -m "docs(design-system): codify the 11 portal-surface doctrine rules"
```

---

## Task 17: Update Modals section (three shapes, not two)

**Files:**
- Modify: `docs/design-system.md`

The existing "Modals" section documents two shapes (Dialog and AlertDialog). Update to add the third shape (`Sheet`) per Rule 9.

- [ ] **Step 1: Locate the existing Modals section**

Open `docs/design-system.md`. The Modals section starts with `## Modals` and currently documents two shapes. Read it.

- [ ] **Step 2: Replace the section's "Two shapes" content with "Three shapes"**

Replace the line:

```markdown
**Two shapes** (established 2026-04-17):
```

with:

```markdown
**Three shapes** (third shape established 2026-04-25, see Doctrine Rule 9):
```

After the existing two numbered shapes, add:

```markdown

3. **Panels** — `<Sheet side="bottom">` / `SheetContent`. Slides up from the bottom on every breakpoint. On mobile, edge-to-edge with rounded top corners. On desktop, contained at `max-w-3xl` with inset margins on left, right, and bottom matching the cart bar. Used for: FamilySheet, ReviewOrderSheet, FilterPanel-on-mobile.
```

- [ ] **Step 3: Commit**

```bash
git add docs/design-system.md
git commit -m "docs(design-system): document the third modal shape (Sheet panel)"
```

---

## Task 18: Update Buttons section to acknowledge the review-sheet `w-full` Submit

**Files:**
- Modify: `docs/design-system.md`

The existing Buttons section says `w-full` is reserved for three specific cases. After Cluster 4 of Plan C, the review sheet's Submit is `w-full` because it's a full-width primary submit at the bottom of a mobile form — that's case (2) of the existing rule. No new exceptions needed; just clarify.

- [ ] **Step 1: Locate the Buttons section**

Open `docs/design-system.md`. Find `## Buttons` and the numbered list under "`w-full` is reserved for three cases."

- [ ] **Step 2: Add a clarifying example to case (2)**

Find:

```markdown
2. A single primary submit at the bottom of a mobile form where the button is the entire row.
```

Replace with:

```markdown
2. A single primary submit at the bottom of a mobile form where the button is the entire row. Example: the `<ReviewOrderSheet>` Submit button is `w-full` on mobile under this case (Plan C, Cluster 4). The review sheet is a form (review + submit), not a navigation surface.
```

- [ ] **Step 3: Commit**

```bash
git add docs/design-system.md
git commit -m "docs(design-system): clarify w-full case 2 with review-sheet example"
```

---

## Task 19: Mark archive theory as superseded

**Files:**
- Modify: `docs/archive/st-9-portal-design-theory.md`

Add the supersession header.

- [ ] **Step 1: Read the archive file's first lines**

Open `docs/archive/st-9-portal-design-theory.md`. The current first line is `# ST-9 Portal Design Theory` followed by `Supersedes [st-9-design-directives-round-2.md]…`.

- [ ] **Step 2: Insert the supersession block immediately after the title**

Insert this block as a new line 2-and-following (before the existing "Supersedes…" line):

```markdown
> **Superseded 2026-04-25.** See [`docs/design-system.md`](../design-system.md) for the current doctrine. The principles in this document remain accurate as *founding theory*, but the explicit rejections of glass and multiple radii have been replaced by the codified rules in the current doctrine. This file is retained as reference for the reasoning behind the original task-first frame.

```

(Note the trailing blank line after the blockquote.)

- [ ] **Step 3: Commit**

```bash
git add docs/archive/st-9-portal-design-theory.md
git commit -m "docs(archive): mark st-9-portal-design-theory as superseded by 2026-04-25 doctrine"
```

---

## Task 20: Final verification — touch test + static checks

**Files:**
- (verification only)

Walk the customer surface against the spec's verification checklist. This is the final gate before the work is considered complete.

- [ ] **Step 1: Run all static checks**

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

All four must pass. Pre-existing lint warnings unrelated to this plan's changes are acceptable; new warnings are not.

- [ ] **Step 2: Start dev server and walk the touch checklist**

```bash
npm run dev
```

Open the portal customer order page on a 375 × 812 mobile viewport (e.g. via DevTools device emulation). Verify each item:

- [ ] Stepper rapid-fire: tap + 5 times rapidly → stepper shows 5 (not 1)
- [ ] Stepper accepts > 999: type "99999" + blur → input snaps to 999
- [ ] Stepper at qty=0: − button shows reduced opacity AND `cursor: not-allowed` on hover
- [ ] FamilySheet: tap any product tile → popout opens (image area is the open target)
- [ ] FamilySheet: tap the floating Stepper pill on a tile → quantity changes, cart bar updates, popout does NOT open
- [ ] Inline page search: type "diet" → result tiles each show a floating Stepper pill
- [ ] Date control: hover the date in the page header → background subtly tints
- [ ] Page-search wrapper: hover the search pill → background subtly tints
- [ ] Cart bar: shows neutral material (no primary-blue tint); the Review button is the only accent-colored element
- [ ] Active-cart tile: a tile with quantity > 0 shows a single primary border (not border + ring)
- [ ] Popout capsule: corners look the same scale as a FamilyCard (rounded-xl)
- [ ] Review drawer: corners look the same scale as the popout (rounded-xl on desktop, rounded-t-xl on mobile)
- [ ] All radii: spot-check 5 random elements; only `rounded-xl` and `rounded-full` are visible

- [ ] **Step 3: If any check fails, return to the relevant task**

Each failure maps directly to a task above. Make the fix in a follow-up commit on the same branch; do not skip the failure.

- [ ] **Step 4: Final commit (only if a follow-up fix was needed)**

```bash
git add -A
git commit -m "fix: final verification touch-up for doctrine compliance"
```

If no fix was needed, the previous commit is the final commit and the plan is complete.

---

## Self-review (run by the engineer before merging)

After all 20 tasks are complete:

1. **Spec coverage.** Open the spec and verify every section in "Code-change list (derived from the doctrine)" maps to one of Tasks 1–12. Documentation work in the spec maps to Tasks 14–19. Verification maps to Tasks 13 and 20.
2. **Placeholder scan.** Search the diff for `TODO`, `TBD`, or `FIXME` introduced by these commits. There should be none.
3. **Type consistency.** The renamed prop `footerSlot` → `overlaySlot` should be consistent across `product-tile.tsx`, `usual-row.tsx`, `family-sheet.tsx`, `inline-search-results.tsx`. Grep for `footerSlot` in `components/catalog/` after the work is done; expected: zero hits.
4. **Doctrine accuracy.** Every rule in `docs/design-system.md`'s new "Doctrine rules" section has at least one code-pointer in the codebase. Spot-check three rules; if any cite something that no longer exists, the doc is wrong.
