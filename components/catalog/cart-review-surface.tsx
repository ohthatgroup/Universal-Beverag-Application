'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import type { ReviewItem } from '@/components/catalog/review-order-sheet'

interface CartReviewSurfaceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Closed-state content
  itemCount: number
  totalValue: number
  showPrices: boolean
  // Open-state content (used in Task 5 — accept now so the prop surface is final)
  deliveryDate: string
  items: ReviewItem[]
  error: string | null
  isResetting: boolean
  isSubmitting: boolean
  onReset: () => void
  onChangeQuantity: (key: string, next: number) => void
  onSubmit: () => void
}

// Single continuous surface that has two states: a cart bar (closed) and a
// review drawer (open). Tapping Review lifts the bar into the drawer in one
// coordinated animation.
//
// This commit lands the closed state. Task 5 adds the open state and
// cross-fade animation.
export function CartReviewSurface({
  open,
  onOpenChange,
  itemCount,
  totalValue,
  showPrices,
}: CartReviewSurfaceProps) {
  if (itemCount === 0 && !open) return null

  // Closed state: the cart bar. Same shape as before — fixed bottom, body
  // width on desktop, neutral surface, accent Review button.
  return (
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
  )
}
