'use client'

import type { CatalogProduct } from '@/lib/types'
import type { Usual } from '@/lib/server/portal-usuals'
import { UsualRow } from '@/components/catalog/usual-row'

interface UsualsListProps {
  usuals: Usual[]
  productById: Map<string, CatalogProduct>
  quantities: Record<string, number>
  productToPalletDealIds: Record<string, string[]>
  onSetQuantity: (product: CatalogProduct, quantity: number) => void
  onOpenPallets?: (productId: string) => void
  showPrices: boolean
}

export function UsualsList({
  usuals,
  productById,
  quantities,
  productToPalletDealIds,
  onSetQuantity,
  onOpenPallets,
  showPrices,
}: UsualsListProps) {
  const entries = usuals
    .map((u) => ({ usual: u, product: productById.get(u.productId) }))
    .filter((entry): entry is { usual: Usual; product: CatalogProduct } =>
      Boolean(entry.product)
    )

  if (entries.length === 0) return null

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-h3 font-semibold">Your usuals</h2>
        <span className="text-xs text-muted-foreground">based on your recent orders</span>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ usual, product }) => (
          <UsualRow
            key={product.id}
            product={product}
            typicalQty={usual.typicalQty}
            reason={usual.reason}
            quantity={quantities[`product:${product.id}`] ?? 0}
            onChange={(next) => onSetQuantity(product, next)}
            showPrices={showPrices}
            hasPalletDeal={(productToPalletDealIds[product.id] ?? []).length > 0}
            onOpenPallets={onOpenPallets ? () => onOpenPallets(product.id) : undefined}
          />
        ))}
      </div>
    </section>
  )
}
