'use client'

import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import type { PalletDeal } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

export interface PalletCardProps {
  palletDeal: PalletDeal
  quantity: number
  onChange: (next: number) => void
  showPrices: boolean
}

export function PalletCard({ palletDeal, quantity, onChange, showPrices }: PalletCardProps) {
  const isSingle = palletDeal.pallet_type === 'single'

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {palletDeal.image_url ? (
        <img
          src={palletDeal.image_url}
          alt={palletDeal.title}
          className="h-36 w-full object-cover"
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-muted">
          <Package className="h-10 w-10 text-muted-foreground" />
        </div>
      )}

      <div className="space-y-2 p-3">
        {palletDeal.savings_text && (
          <div className="text-sm font-semibold text-accent">{palletDeal.savings_text}</div>
        )}
        <div>
          <div className="font-medium">{palletDeal.title}</div>
          {palletDeal.description && (
            <div className="text-xs text-muted-foreground">{palletDeal.description}</div>
          )}
        </div>
        {showPrices && (
          <div className="text-sm">{formatCurrency(palletDeal.price)}</div>
        )}

        <div className="flex justify-end pt-1">
          {isSingle ? (
            <Button
              type="button"
              size="sm"
              variant={quantity > 0 ? 'default' : 'accent'}
              onClick={() => onChange(quantity > 0 ? 0 : 1)}
            >
              {quantity > 0 ? 'Selected' : 'Add pallet'}
            </Button>
          ) : (
            <QuantitySelector quantity={quantity} onChange={onChange} />
          )}
        </div>
      </div>
    </div>
  )
}
