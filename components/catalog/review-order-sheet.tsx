'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Stepper } from '@/components/ui/stepper'
import { SurfaceFooter, SurfaceHeader } from '@/components/ui/surface'
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

// Bottom-sliding review drawer. Slides in from the bottom on every
// breakpoint; on desktop it's inset on the sides + bottom so it feels
// like a contained panel rather than a full-bleed sheet.
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
            'fixed z-50 flex flex-col bg-background shadow-2xl outline-none',
            // Slide-from-bottom on every breakpoint.
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            // Mobile: pinned bottom, edge-to-edge, ~68dvh, rounded top corners.
            'inset-x-0 bottom-0 h-[68dvh] rounded-t-2xl border-t',
            // Desktop: contained — inset on left, right, and bottom matching
            // the cart bar's margins so it reads as a floating panel
            // anchored to the page content rather than a full-bleed sheet.
            'md:inset-x-4 md:bottom-4 md:mx-auto md:h-[68dvh] md:max-w-3xl md:rounded-2xl md:border',
          )}
        >
          <SurfaceHeader className="px-1">
            <div className="min-w-0 flex-1 px-4">
              <DialogTitle className="text-base font-semibold leading-tight">
                Review your order
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Delivery {formatDeliveryDate(deliveryDate)}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 flex-none"
                aria-label="Close review"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </SurfaceHeader>

          {/* Items — dense list rows. Title + pack on the left, price stack
              on the right; stepper bottom-right beneath the price. The
              "Clear order" link sits in the top-right of this area, where
              the user is already looking when they decide to wipe — not
              competing with Submit in the footer. */}
          <div className="flex-1 overflow-y-auto">
            {items.length > 0 && (
              <div className="flex items-center justify-between border-b px-5 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
                <button
                  type="button"
                  onClick={onReset}
                  disabled={isResetting}
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isResetting ? 'Clearing…' : 'Clear order'}
                </button>
              </div>
            )}
            {items.length > 0 ? (
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.key} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-semibold leading-tight">
                          {item.label}
                        </div>
                        {item.details && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {item.details}
                          </div>
                        )}
                        {showPrices && (
                          <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                            {formatCurrency(item.unitPrice)} × {item.quantity}
                            <span className="ml-1.5 font-semibold text-foreground">
                              = {formatCurrency(item.lineTotal)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-none">
                        <Stepper
                          quantity={item.quantity}
                          onChange={(next) => onChangeQuantity(item.key, next)}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No items yet"
                description="Add products from the catalog."
              />
            )}
          </div>

          <SurfaceFooter>
            {error && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
            {showPrices && (
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={onSubmit}
              disabled={itemCount === 0 || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Submitting…' : 'Submit order'}
            </Button>
          </SurfaceFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
