'use client'

import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Stepper } from '@/components/ui/stepper'
import type { CatalogProduct } from '@/lib/types'
import {
  cn,
  formatCurrency,
  getProductPackLabel,
} from '@/lib/utils'
import { surfaceFloating } from '@/lib/design/surfaces'

interface ProductPopoutProps {
  product: CatalogProduct | null
  quantity: number
  onChange: (next: number) => void
  onOpenChange: (open: boolean) => void
  showPrices: boolean
}

// Wholesale-tuned quantity capsule.
//
//   ┌──────────────────────────────────┐
//   │                                  │
//   │   [packaging photo, square]      │
//   │                                  │
//   ├──────────────────────────────────┤
//   │ Cherry Coke         ┌────────┐   │
//   │ 24/20 OZ · $32.95   │ − 2 + │   │  ← canonical <Stepper /> primitive
//   │                     └────────┘   │
//   └──────────────────────────────────┘
//
// No close, no Done. Auto-save + tap-outside dismiss.
export function ProductPopout({
  product,
  quantity,
  onChange,
  onOpenChange,
  showPrices,
}: ProductPopoutProps) {
  const open = product !== null

  if (!product) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent className="hidden" />
      </Dialog>
    )
  }

  const thumbSrc = product.image_url ?? null
  const packLabel = getProductPackLabel(product)
  const packCount =
    typeof product.pack_count === 'number' && product.pack_count > 0
      ? product.pack_count
      : null
  const casePrice = product.effective_price
  const priceSuffix = packCount && packCount > 1 ? ' / case' : ''

  const meta = [packLabel, showPrices ? `${formatCurrency(casePrice)}${priceSuffix}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Override the shared dialog's `grid` display so the inner
          // aspect-square photo respects the capsule's stated width.
          'block w-[calc(100vw-1.5rem)] max-w-[22rem] gap-0 p-4',
          'max-h-[88dvh] overflow-y-auto rounded-xl',
          surfaceFloating,
          // Hide Radix's default X — tap-outside dismisses.
          '[&>button]:hidden',
        )}
      >
        <DialogTitle className="sr-only">{product.title}</DialogTitle>

        {/* Packaging photo — square, flush with the capsule's inner edge. */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-background/40">
          {thumbSrc ? (
            <Image
              src={thumbSrc}
              alt=""
              fill
              sizes="(min-width: 768px) 22rem, 90vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/20 p-6">
              <span className="line-clamp-4 text-center text-base font-bold leading-tight text-muted-foreground">
                {product.title}
              </span>
            </div>
          )}
        </div>

        {/* Identity left, dug-in stepper right. */}
        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-tight">
              {product.title}
            </h3>
            {meta && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {meta}
              </p>
            )}
          </div>
          <Stepper quantity={quantity} onChange={onChange} size="md" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
