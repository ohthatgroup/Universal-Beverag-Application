'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import { surfaceOverlayPrimary } from '@/lib/design/surfaces'

interface CartSummaryBarProps {
  itemCount: number
  totalValue: number
  showPrices: boolean
  onReview: () => void
}

// Fixed-bottom cart summary.
//   - Mobile: edge-to-edge band pinned to the bottom of the viewport.
//   - Desktop (md+): floating pill, max-width matching the page content
//     container so the bar visually aligns with the page's logo + profile.
export function CartSummaryBar({
  itemCount,
  totalValue,
  showPrices,
  onReview,
}: CartSummaryBarProps) {
  if (itemCount === 0) return null

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 px-0 md:bottom-4 md:px-4',
        // Outer wrapper just centers the inner pill on desktop.
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center justify-between gap-3 p-3',
          // Mobile: edge-to-edge band with a top border for separation.
          'border-t border-primary/20',
          // Desktop: pill — rounded, contained max-width, soft drop shadow,
          // no top border (floats independently above the page).
          'md:max-w-3xl md:rounded-full md:border md:px-5 md:py-2.5 md:shadow-2xl',
          surfaceOverlayPrimary,
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
          onClick={onReview}
          className="gap-1.5"
        >
          Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
