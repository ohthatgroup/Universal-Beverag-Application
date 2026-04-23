'use client'

import Image from 'next/image'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import type { CatalogProduct } from '@/lib/types'
import { formatCurrency, getProductDisplayName, getProductPackLabel } from '@/lib/utils'

export interface BrowseRowProps {
  product: CatalogProduct
  quantity: number
  onChange: (next: number) => void
  showPrices: boolean
  hasPalletDeal?: boolean
  onOpenPallets?: () => void
}

function initialFor(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '·'
  return trimmed.charAt(0).toUpperCase()
}

export function BrowseRow({
  product,
  quantity,
  onChange,
  showPrices,
}: BrowseRowProps) {
  const displayName = getProductDisplayName(product, product.brand?.name ?? null)
  const packLabel = getProductPackLabel(product) ?? ''
  const brandName = product.brand?.name ?? ''
  const meta = [brandName, packLabel].filter(Boolean).join(' · ')
  const thumbSrc = product.image_url ?? product.brand?.logo_url ?? null

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <QuantitySelector quantity={quantity} onChange={onChange} />
      {thumbSrc ? (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-background">
          <Image
            src={thumbSrc}
            alt={displayName}
            width={40}
            height={40}
            className="h-full w-full object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground" aria-hidden="true">
          {initialFor(displayName)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{displayName}</div>
        <div className="text-xs text-muted-foreground">
          {meta}
          {showPrices && <> · {formatCurrency(product.effective_price)}</>}
        </div>
      </div>
    </div>
  )
}
