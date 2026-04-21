'use client'

import { BrowseRow } from '@/components/catalog/browse-row'
import type { CatalogGroup } from '@/lib/hooks/useCatalog'
import type { CatalogProduct } from '@/lib/types'

export type GroupByOption = 'brand' | 'size'

interface BrowseListGroupedProps {
  groups: CatalogGroup[]
  groupBy: GroupByOption
  // When a filter or search is active, render flat (no headers).
  flat: boolean
  quantityFor: (product: CatalogProduct) => number
  onChange: (product: CatalogProduct, next: number) => void
  showPrices: boolean
  productToPalletDealIds?: Record<string, string[]>
  // When flat, callers pre-compute the flattened list (to strip usuals etc).
  flatProducts?: CatalogProduct[]
}

const GROUP_PREFIX: Record<GroupByOption, string> = {
  brand: 'Brand',
  size: 'Size',
}

export function BrowseListGrouped({
  groups,
  groupBy,
  flat,
  quantityFor,
  onChange,
  showPrices,
  productToPalletDealIds,
  flatProducts,
}: BrowseListGroupedProps) {
  if (flat) {
    const list = flatProducts ?? groups.flatMap((g) => g.products)
    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground">No products match your filters.</p>
    }
    return (
      <div className="divide-y rounded-md border">
        {list.map((product) => (
          <BrowseRow
            key={product.id}
            product={product}
            quantity={quantityFor(product)}
            onChange={(next) => onChange(product, next)}
            showPrices={showPrices}
            hasPalletDeal={(productToPalletDealIds?.[product.id] ?? []).length > 0}
          />
        ))}
      </div>
    )
  }

  const visibleGroups = groups.filter((g) => g.products.length > 0)
  if (visibleGroups.length === 0) {
    return <p className="text-sm text-muted-foreground">No products match your filters.</p>
  }

  return (
    <div className="space-y-4">
      {visibleGroups.map((group) => (
        <section key={group.key}>
          <div className="sticky top-0 z-10 bg-background/95 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
            {GROUP_PREFIX[groupBy]}: {group.label}
          </div>
          <div className="mt-1 divide-y rounded-md border">
            {group.products.map((product) => (
              <BrowseRow
                key={product.id}
                product={product}
                quantity={quantityFor(product)}
                onChange={(next) => onChange(product, next)}
                showPrices={showPrices}
                hasPalletDeal={(productToPalletDealIds?.[product.id] ?? []).length > 0}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
