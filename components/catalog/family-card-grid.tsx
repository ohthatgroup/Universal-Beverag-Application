'use client'

import { FamilyCard } from '@/components/catalog/family-card'
import { FAMILIES } from '@/lib/catalog/families'
import type { ProductFamily } from '@/lib/server/schemas'
import type { FamilyCounts } from '@/lib/catalog/family-counts'

interface FamilyCardGridProps {
  productCounts: FamilyCounts
  inOrderCounts: FamilyCounts
  onSelect: (family: ProductFamily) => void
}

// 2-col grid of FamilyCards (the BROWSE section). Empty families hide so the
// grid stays useful — the user never sees "Other · 0 products" as a tap
// target that can't lead anywhere.
export function FamilyCardGrid({
  productCounts,
  inOrderCounts,
  onSelect,
}: FamilyCardGridProps) {
  const visibleFamilies = FAMILIES.filter(
    (family) => (productCounts[family.key] ?? 0) > 0,
  )
  if (visibleFamilies.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-foreground/80">
        Browse
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {visibleFamilies.map((family) => (
          <FamilyCard
            key={family.key}
            family={family}
            productCount={productCounts[family.key] ?? 0}
            inOrderCount={inOrderCounts[family.key] ?? 0}
            onSelect={() => onSelect(family.key)}
          />
        ))}
      </div>
    </section>
  )
}
