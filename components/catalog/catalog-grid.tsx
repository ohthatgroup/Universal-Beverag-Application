'use client'

import { EmptyState } from '@/components/ui/empty-state'
import { ProductTile } from '@/components/catalog/product-tile'
import type { CatalogSizeBrandGroup } from '@/lib/hooks/useCatalog'
import type { CatalogProduct } from '@/lib/types'

interface CatalogGridProps {
  nestedGroups: CatalogSizeBrandGroup[]
  flat: boolean
  flatProducts: CatalogProduct[]
  quantityFor: (product: CatalogProduct) => number
  onOpen: (product: CatalogProduct) => void
}

const GRID_CLASSES = 'grid grid-cols-4 gap-2 md:grid-cols-8'

export function CatalogGrid({
  nestedGroups,
  flat,
  flatProducts,
  quantityFor,
  onOpen,
}: CatalogGridProps) {
  if (flat) {
    if (flatProducts.length === 0) {
      return <EmptyState title="No products match" description="Try clearing a filter." />
    }
    return (
      <div className={GRID_CLASSES}>
        {flatProducts.map((product) => (
          <ProductTile
            key={product.id}
            product={product}
            quantity={quantityFor(product)}
            onOpen={() => onOpen(product)}
          />
        ))}
      </div>
    )
  }

  const visibleSizes = nestedGroups
    .map((size) => ({
      ...size,
      brandGroups: size.brandGroups.filter((bg) => bg.products.length > 0),
    }))
    .filter((size) => size.brandGroups.length > 0)

  if (visibleSizes.length === 0) {
    return <EmptyState title="No products match" description="Try clearing a filter." />
  }

  return (
    <div className="space-y-4">
      {visibleSizes.map((size) => (
        <section key={size.key}>
          <div className="sticky top-0 z-20 -mx-2 bg-background/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
            Size: {size.sizeLabel}
          </div>
          <div className="mt-1 space-y-3">
            {size.brandGroups.map((brand) => (
              <div key={`${size.key}:${brand.key}`}>
                <div className="px-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  {brand.label}
                </div>
                <div className={GRID_CLASSES}>
                  {brand.products.map((product) => (
                    <ProductTile
                      key={product.id}
                      product={product}
                      quantity={quantityFor(product)}
                      onOpen={() => onOpen(product)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
