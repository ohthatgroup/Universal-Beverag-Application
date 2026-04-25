'use client'

import { ProductTile } from '@/components/catalog/product-tile'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import type { CatalogProduct } from '@/lib/types'

export interface UsualRowProps {
  product: CatalogProduct
  quantity: number
  onChange: (next: number) => void
  onOpen: () => void
  // Kept on the prop surface for compatibility — pricing lives in the popout.
  showPrices: boolean
}

// Usuals variant of the ProductTile: same image-first card, but with the
// QuantitySelector slotted into the bottom glass strip so reorders are a
// single tap. Tapping the image area still opens the popout for full details.
export function UsualRow({ product, quantity, onChange, onOpen }: UsualRowProps) {
  return (
    <ProductTile
      product={product}
      quantity={quantity}
      onOpen={onOpen}
      footerSlot={
        <div className="flex justify-center">
          <QuantitySelector quantity={quantity} onChange={onChange} />
        </div>
      }
    />
  )
}
