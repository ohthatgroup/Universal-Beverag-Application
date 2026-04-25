'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import { surfaceOverlay } from '@/lib/design/surfaces'

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
//
// Per doctrine Rule 6: the bar uses neutral `surfaceOverlay`. The accent
// Review button is the single primary affordance — no double-tinting.
export function CartSummaryBar({
  itemCount,
  totalValue,
  showPrices,
  onReview,
}: CartSummaryBarProps) {
  if (itemCount === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-0 md:bottom-4 md:px-4">
      <div
        className={cn(
          'mx-auto flex items-center justify-between gap-3 p-3',
          // Desktop: pill — rounded-full, contained max-width, soft drop shadow.
          'md:max-w-3xl md:rounded-full md:px-5 md:py-2.5 md:shadow-2xl',
          surfaceOverlay,
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
