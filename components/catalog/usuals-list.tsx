'use client'

import type { CatalogProduct } from '@/lib/types'
import type { Usual } from '@/lib/server/portal-usuals'
import { UsualRow } from '@/components/catalog/usual-row'

interface UsualsListProps {
  usuals: Usual[]
  productById: Map<string, CatalogProduct>
  quantities: Record<string, number>
  onSetQuantity: (product: CatalogProduct, quantity: number) => void
  onOpenProduct: (product: CatalogProduct) => void
  showPrices: boolean
}

// Image-first 2-column grid (mobile) / 3-col (desktop). Renders one
// UsualRow card per usual product. Hidden when there are no resolvable
// usuals (e.g. first-time customer).
export function UsualsList({
  usuals,
  productById,
  quantities,
  onSetQuantity,
  onOpenProduct,
  showPrices,
}: UsualsListProps) {
  const entries = usuals
    .map((usual) => productById.get(usual.productId))
    .filter((product): product is CatalogProduct => Boolean(product))

  if (entries.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-foreground/80">
        Your usuals
      </h2>
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4">
        {entries.map((product) => (
          <UsualRow
            key={product.id}
            product={product}
            quantity={quantities[`product:${product.id}`] ?? 0}
            onChange={(next) => onSetQuantity(product, next)}
            onOpen={() => onOpenProduct(product)}
            showPrices={showPrices}
          />
        ))}
      </div>
    </section>
  )
}
