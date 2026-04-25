'use client'

import Image from 'next/image'
import type { CatalogProduct } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ProductTileProps {
  product: CatalogProduct
  quantity: number
  onOpen: () => void
  // Optional control slot below the image. When provided, the image area
  // fills the rest of the card and the slot hugs the bottom edge inside a
  // tight bordered bar — no gap, no whitespace under the controls.
  footerSlot?: React.ReactNode
}

// Image-first product tile.
//
// Without footerSlot: image fills the whole card, edge-to-edge. Used by
// FamilySheet / search results.
// With footerSlot: image fills the top portion, controls live in a tight
// bar directly beneath, hugging the image. Used by usuals.
export function ProductTile({
  product,
  quantity,
  onOpen,
  footerSlot,
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
        'relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition',
        'hover:shadow-md',
        hasQty && 'border-primary/60 ring-1 ring-primary/40',
      )}
    >
      {/* Image area — fills the available vertical space. With a
          footerSlot it shrinks just enough to make room for the bar
          below; without one, it takes the full card. */}
      <div className="relative flex-1">
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

        {/* Open-target — image area only. */}
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
      </div>

      {/* Footer bar — hugs the image bottom edge with a single divider
          line; no inset, no gap, no extra whitespace under the controls. */}
      {footerSlot && (
        <div className="flex flex-none items-center justify-center border-t bg-background px-1.5 py-1">
          {footerSlot}
        </div>
      )}
    </div>
  )
}
