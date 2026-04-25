'use client'

import Image from 'next/image'
import { Panel } from '@/components/ui/panel'
import { Stepper } from '@/components/ui/stepper'
import type { CatalogProduct } from '@/lib/types'
import { formatCurrency, getProductPackLabel } from '@/lib/utils'

interface ProductPopoutProps {
  product: CatalogProduct | null
  quantity: number
  onChange: (next: number) => void
  onOpenChange: (open: boolean) => void
  showPrices: boolean
}

// Wholesale-tuned quantity capsule. Centered, ~22rem max-width, square photo
// at the top, identity + dug-in stepper below. Tap-outside dismisses.
export function ProductPopout({
  product,
  quantity,
  onChange,
  onOpenChange,
  showPrices,
}: ProductPopoutProps) {
  const open = product !== null

  if (!product) {
    return null
  }

  const thumbSrc = product.image_url ?? null
  const packLabel = getProductPackLabel(product)
  const packCount =
    typeof product.pack_count === 'number' && product.pack_count > 0
      ? product.pack_count
      : null
  const casePrice = product.effective_price
  const priceSuffix = packCount && packCount > 1 ? ' / case' : ''

  const meta = [
    packLabel,
    showPrices ? `${formatCurrency(casePrice)}${priceSuffix}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Panel
      open={open}
      onOpenChange={onOpenChange}
      variant="centered"
      srTitle={product.title}
      contentClassName="max-w-[22rem] p-4"
    >
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

      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-tight">
            {product.title}
          </h3>
          {meta && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta}</p>
          )}
        </div>
        <Stepper quantity={quantity} onChange={onChange} size="md" />
      </div>
    </Panel>
  )
}
