'use client'

import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface CartSummaryBarProps {
  itemCount: number
  totalValue: number
  showPrices: boolean
  onReview: () => void
}

export function CartSummaryBar({ itemCount, totalValue, showPrices, onReview }: CartSummaryBarProps) {
  if (itemCount === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background p-3 md:static md:mt-6 md:border md:rounded-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 md:max-w-none">
        <div className="text-sm">
          <span className="font-medium">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          {showPrices && (
            <span className="text-muted-foreground"> · {formatCurrency(totalValue)}</span>
          )}
        </div>
        <Button type="button" variant="accent" size="sm" onClick={onReview}>
          Review
        </Button>
      </div>
    </div>
  )
}
