'use client'

import { useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import { cn, formatCurrency, formatDeliveryDate } from '@/lib/utils'

export interface ReviewItem {
  key: string
  label: string
  details: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface ReviewOrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliveryDate: string
  items: ReviewItem[]
  itemCount: number
  totalValue: number
  showPrices: boolean
  error: string | null
  isResetting: boolean
  isSubmitting: boolean
  onReset: () => void
  onChangeQuantity: (key: string, next: number) => void
  onSubmit: () => void
}

export function ReviewOrderSheet({
  open,
  onOpenChange,
  deliveryDate,
  items,
  itemCount,
  totalValue,
  showPrices,
  error,
  isResetting,
  isSubmitting,
  onReset,
  onChangeQuantity,
  onSubmit,
}: ReviewOrderSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  return (
    <>
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={() => onOpenChange(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto h-[70vh] max-w-3xl rounded-t-md border-t bg-background shadow-xl transition-transform duration-200 ease-out md:bottom-4 md:left-4 md:right-4 md:h-[70vh] md:rounded-md md:border',
          open ? 'translate-y-0' : 'translate-y-[calc(100%+1rem)]'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Review order · {formatDeliveryDate(deliveryDate)}
              </div>
              <div className="text-sm font-semibold">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                {showPrices && <> · {formatCurrency(totalValue)}</>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onReset}
                disabled={isResetting || itemCount === 0}
              >
                {isResetting ? 'Resetting…' : 'Reset all'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                aria-label="Close review"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4">
            {items.length > 0 ? (
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.key} className="py-3">
                    <div className="font-medium leading-snug">{item.label}</div>
                    {item.details && (
                      <div className="text-xs text-muted-foreground">{item.details}</div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {showPrices ? (
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                        </div>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-3">
                        {showPrices && (
                          <span className="text-sm font-medium">{formatCurrency(item.lineTotal)}</span>
                        )}
                        <QuantitySelector
                          quantity={item.quantity}
                          onChange={(next) => onChangeQuantity(item.key, next)}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 text-sm text-muted-foreground">No items added yet.</div>
            )}
          </div>

          <div className="mx-auto w-full max-w-2xl space-y-3 border-t px-4 py-4">
            {error && <p className="text-xs text-destructive">{error}</p>}
            {showPrices && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-base font-semibold">{formatCurrency(totalValue)}</span>
              </div>
            )}
            <Button
              type="button"
              variant="accent"
              size="lg"
              className="w-full"
              onClick={onSubmit}
              disabled={itemCount === 0 || isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit order'}
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
