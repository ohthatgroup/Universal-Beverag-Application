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
