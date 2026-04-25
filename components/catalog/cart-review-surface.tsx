'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stepper } from '@/components/ui/stepper'
import { EmptyState } from '@/components/ui/empty-state'
import { cn, formatCurrency, formatDeliveryDate } from '@/lib/utils'

export interface ReviewItem {
  key: string
  label: string
  details: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface CartReviewSurfaceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemCount: number
  totalValue: number
  showPrices: boolean
  deliveryDate: string
  items: ReviewItem[]
  error: string | null
  isResetting: boolean
  isSubmitting: boolean
  onReset: () => void
  onChangeQuantity: (key: string, next: number) => void
  onSubmit: () => void
}

// Closed-state cart bar and open-state review drawer share one DOM surface.
// Opening lifts the bar into a 68dvh panel; bar content cross-fades to
// drawer footer content; drawer body fades in from the top.
//
// Implementation: two render branches — closed (plain fixed div) and open
// (Radix Dialog so focus traps and Escape work). The transition between
// branches is intentionally a swap — the visual continuity comes from
// matching the surface shape (rounded, body-width, shadow) and the
// matching footer-row content.
export function CartReviewSurface({
  open,
  onOpenChange,
  itemCount,
  totalValue,
  showPrices,
  deliveryDate,
  items,
  error,
  isResetting,
  isSubmitting,
  onReset,
  onChangeQuantity,
  onSubmit,
}: CartReviewSurfaceProps) {
  // Track whether the open state has ever been entered, so we can keep the
  // Dialog mounted briefly for the close animation.
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  if (itemCount === 0 && !open && !mounted) return null

  return (
    <>
      {/* Closed-state bar. Hidden when drawer is open (the drawer renders
          its own footer with the same shape). */}
      {!open && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-0 md:bottom-4 md:px-4">
          <div
            className={cn(
              'mx-auto flex items-center justify-between gap-3 border border-foreground/10 bg-background p-3 shadow-2xl',
              'md:max-w-3xl md:rounded-full md:px-5 md:py-2.5',
            )}
          >
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-semibold">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              {showPrices && (
                <span className="font-semibold tabular-nums text-foreground/80">
                  {formatCurrency(totalValue)}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={() => onOpenChange(true)}
              className="gap-1.5"
            >
              Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Open-state drawer. Radix Dialog for focus trap + Escape handling.
          Slides up from the bottom; content fades in. The drawer's footer
          uses the same shape and total/Submit content as the closed bar's
          footer — so the swap reads as the bar lifting into a panel. */}
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) {
            // Allow close animation to finish before unmounting.
            setTimeout(() => setMounted(false), 320)
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-40 bg-foreground/30 backdrop-blur-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex h-[68dvh] flex-col overflow-hidden border border-foreground/10 bg-background shadow-2xl outline-none',
              'rounded-t-xl md:max-w-3xl md:mx-auto md:bottom-4 md:inset-x-4 md:rounded-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
              'duration-300 ease-ios-sheet',
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              Review your order
            </DialogPrimitive.Title>

            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-2 sm:hidden">
              <span
                className="h-1 w-10 rounded-full bg-muted-foreground/30"
                aria-hidden
              />
            </div>

            {/* Header: delivery date + close */}
            <div className="flex items-center gap-2 border-b border-foreground/10 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold leading-tight">
                  Review your order
                </div>
                <div className="text-xs text-muted-foreground">
                  Delivery {formatDeliveryDate(deliveryDate)}
                </div>
              </div>
              <DialogPrimitive.Close
                aria-label="Close review"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            {/* Items area + sub-row with item count and Clear order */}
            <div className="flex-1 overflow-y-auto">
              {items.length > 0 && (
                <div className="flex items-center justify-between px-5 pb-1 pt-3">
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

            {/* Footer: total + Submit. Same shape as the closed-bar's bar
                so the swap reads as continuous. */}
            <div className="space-y-3 border-t border-foreground/10 px-5 py-4">
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
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
