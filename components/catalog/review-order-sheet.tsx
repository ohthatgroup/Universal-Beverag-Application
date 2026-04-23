'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogPortal, DialogOverlay, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col bg-background shadow-xl outline-none',
            // Mobile: bottom sheet (full width, pinned bottom, ~85vh)
            'inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl border-t',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            // Desktop: centered card — 65% viewport height, auto-scrolls body
            'sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-[65vh] sm:max-h-[65vh] sm:w-full sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl sm:border',
            'sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]',
            'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]',
            'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95'
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">Review your order</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Delivery: {formatDeliveryDate(deliveryDate)}
              </DialogDescription>
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
              <DialogClose asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label="Close review"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {items.length > 0 ? (
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.key} className="py-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <QuantitySelector
                          quantity={item.quantity}
                          onChange={(next) => onChangeQuantity(item.key, next)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium leading-snug">{item.label}</div>
                        {item.details && (
                          <div className="text-xs text-muted-foreground">{item.details}</div>
                        )}
                        {showPrices && (
                          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>
                              {formatCurrency(item.unitPrice)} × {item.quantity}
                            </span>
                            <span className="text-sm font-medium tabular-nums text-foreground">
                              {formatCurrency(item.lineTotal)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No items yet" description="Add products from the catalog." />
            )}
          </div>

          <div className="space-y-3 border-t px-5 py-4">
            {error && <p className="text-xs text-destructive">{error}</p>}
            {showPrices && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-base font-semibold tabular-nums">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="accent"
                size="lg"
                onClick={onSubmit}
                disabled={itemCount === 0 || isSubmitting}
              >
                {isSubmitting ? 'Submitting…' : 'Submit order'}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
