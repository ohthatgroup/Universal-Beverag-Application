'use client'

import Image from 'next/image'
import type { CatalogProduct } from '@/lib/types'
import {
  cn,
  getProductDisplayName,
  getProductSizeLabel,
} from '@/lib/utils'

interface ProductTileProps {
  product: CatalogProduct
  quantity: number
  onOpen: () => void
}

function initialFor(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '·'
  return trimmed.charAt(0).toUpperCase()
}

export function ProductTile({ product, quantity, onOpen }: ProductTileProps) {
  const displayName = getProductDisplayName(product, product.brand?.name ?? null)
  const sizeLabel = getProductSizeLabel(product) ?? ''
  const brandName = product.brand?.name ?? ''
  const thumbSrc = product.image_url ?? product.brand?.logo_url ?? null
  const hasQty = quantity > 0
  const ariaLabel = [brandName, product.title, sizeLabel, hasQty ? `qty ${quantity}` : null]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel || displayName}
      className={cn(
        'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border bg-card p-1 transition',
        'hover:border-primary/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        hasQty && 'border-primary/60 ring-1 ring-primary/30',
      )}
    >
      {thumbSrc ? (
        <Image
          src={thumbSrc}
          alt=""
          width={160}
          height={160}
          className="h-full w-full object-contain"
          unoptimized
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded bg-muted text-lg font-semibold text-muted-foreground"
          aria-hidden="true"
        >
          {initialFor(displayName)}
        </span>
      )}
      {hasQty && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-1 top-1 min-w-[1.25rem] rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-primary-foreground shadow-sm"
        >
          {quantity}
        </span>
      )}
    </button>
  )
}
