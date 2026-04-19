'use client'

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

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{displayName}</div>
        <div className="text-xs text-muted-foreground">
          {meta}
          {showPrices && <> · {formatCurrency(product.effective_price)}</>}
        </div>
      </div>
      <QuantitySelector quantity={quantity} onChange={onChange} />
    </div>
  )
}
