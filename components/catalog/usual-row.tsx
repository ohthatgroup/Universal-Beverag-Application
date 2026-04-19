'use client'

import { Check, Package, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import type { CatalogProduct } from '@/lib/types'
import { formatCurrency, getProductDisplayName, getProductPackLabel } from '@/lib/utils'

export interface UsualRowProps {
  product: CatalogProduct
  typicalQty: number
  reason: 'frequent' | 'pinned'
  quantity: number
  onChange: (next: number) => void
  showPrices: boolean
  hasPalletDeal?: boolean
  onOpenPallets?: () => void
}

export function UsualRow({
  product,
  typicalQty,
  reason,
  quantity,
  onChange,
  showPrices,
  hasPalletDeal,
  onOpenPallets,
}: UsualRowProps) {
  const displayName = getProductDisplayName(product, product.brand?.name ?? null)
  const packLabel = getProductPackLabel(product) ?? ''
  const signal =
    reason === 'pinned' ? 'Pinned by your salesman' : `Usually buys ${typicalQty}`

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex gap-3">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-14 w-14 flex-none rounded-md object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-md bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {product.brand?.name && (
            <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {product.brand.logo_url ? (
                <img
                  src={product.brand.logo_url}
                  alt=""
                  className="h-3 w-3 rounded-full object-cover"
                />
              ) : null}
              {product.brand.name}
            </span>
          )}
          <div className="font-medium leading-snug">{displayName}</div>
          <div className="text-xs text-muted-foreground">
            {packLabel}
            {showPrices && <> · {formatCurrency(product.effective_price)}</>}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{signal}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {quantity === 0 ? (
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={() => onChange(typicalQty)}
          >
            Reorder {typicalQty}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <QuantitySelector quantity={quantity} onChange={onChange} />
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5" /> Added
            </span>
          </div>
        )}

        {hasPalletDeal && onOpenPallets && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={onOpenPallets}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Save with a pallet
          </Button>
        )}
      </div>
    </div>
  )
}
