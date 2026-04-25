'use client'

import { ProductTile } from '@/components/catalog/product-tile'
import { Stepper } from '@/components/ui/stepper'
import type { CatalogProduct } from '@/lib/types'

export interface UsualRowProps {
  product: CatalogProduct
  quantity: number
  onChange: (next: number) => void
  onOpen: () => void
  // Kept on the prop surface for API symmetry — pricing lives in the popout.
  showPrices: boolean
}

// Usuals variant of the ProductTile: the image fills the entire card,
// the Stepper overlays the bottom as a floating dug-in pill (Rule 4).
// Tapping anywhere on the image (outside the pill) opens the popout for
// full details.
export function UsualRow({ product, quantity, onChange, onOpen }: UsualRowProps) {
  return (
    <ProductTile
      product={product}
      quantity={quantity}
      onOpen={onOpen}
      overlaySlot={<Stepper quantity={quantity} onChange={onChange} />}
    />
  )
}
