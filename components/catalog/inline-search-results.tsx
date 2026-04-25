'use client'

import { useMemo } from 'react'
import { ProductTile } from '@/components/catalog/product-tile'
import { EmptyState } from '@/components/ui/empty-state'
import { Stepper } from '@/components/ui/stepper'
import { FAMILIES } from '@/lib/catalog/families'
import type { CatalogProduct } from '@/lib/types'
import type { ProductFamily } from '@/lib/server/schemas'

interface InlineSearchResultsProps {
  query: string
  products: CatalogProduct[]
  quantityFor: (product: CatalogProduct) => number
  onOpenProduct: (product: CatalogProduct) => void
  onSetQuantity: (product: CatalogProduct, next: number) => void
}

const TILE_GRID_CLASSES = 'grid grid-cols-3 gap-1 md:grid-cols-5'

// Grid of tiles matching the user's typed query, grouped by family for
// orientation. Renders inline beneath the page's search input — no modal,
// no sheet. Empty when query has no matches.
export function InlineSearchResults({
  query,
  products,
  quantityFor,
  onOpenProduct,
  onSetQuantity,
}: InlineSearchResultsProps) {
  const sections = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []
    const matches = products.filter((product) =>
      product.title.toLowerCase().includes(trimmed),
    )
    const sectionMap = new Map<ProductFamily, CatalogProduct[]>()
    for (const product of matches) {
      const family = (product.product_family as ProductFamily) ?? 'other'
      if (!sectionMap.has(family)) sectionMap.set(family, [])
      sectionMap.get(family)!.push(product)
    }
    return FAMILIES.flatMap((family) => {
      const list = sectionMap.get(family.key)
      return list && list.length > 0
        ? [{ family: family.key, label: family.label, products: list }]
        : []
    })
  }, [products, query])

  if (sections.length === 0) {
    return (
      <EmptyState
        title="No matches"
        description={`No products match "${query.trim()}".`}
      />
    )
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section key={section.family}>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span>{section.label}</span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>
          <div className={TILE_GRID_CLASSES}>
            {section.products.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                quantity={quantityFor(product)}
                onOpen={() => onOpenProduct(product)}
                overlaySlot={
                  <Stepper
                    quantity={quantityFor(product)}
                    onChange={(next) => onSetQuantity(product, next)}
                  />
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
