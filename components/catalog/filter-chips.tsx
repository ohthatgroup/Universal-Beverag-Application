'use client'

import type { Brand } from '@/lib/types'
import { FilterChip, FilterChipRow } from '@/components/ui/filter-chip'

interface BrandChipsProps {
  brands: Brand[]
  selectedBrandIds: string[]
  onToggle: (brandId: string) => void
  onClear?: () => void
}

export function BrandChips({
  brands,
  selectedBrandIds,
  onToggle,
  onClear,
}: BrandChipsProps) {
  if (brands.length === 0) return null
  const selectedSet = new Set(selectedBrandIds)
  return (
    <FilterChipRow label="Brand">
      {brands.map((brand) => (
        <FilterChip
          key={brand.id}
          active={selectedSet.has(brand.id)}
          onClick={() => onToggle(brand.id)}
        >
          {brand.name}
        </FilterChip>
      ))}
      {selectedBrandIds.length > 0 && onClear && (
        <FilterChip variant="ghost" onClick={onClear}>
          Clear
        </FilterChip>
      )}
    </FilterChipRow>
  )
}

interface SizeChipsProps {
  sizes: string[]
  selectedSizes: string[]
  onToggle: (size: string) => void
  onClear?: () => void
}

export function SizeChips({
  sizes,
  selectedSizes,
  onToggle,
  onClear,
}: SizeChipsProps) {
  if (sizes.length === 0) return null
  const selectedSet = new Set(selectedSizes)
  return (
    <FilterChipRow label="Size">
      {sizes.map((size) => (
        <FilterChip
          key={size}
          active={selectedSet.has(size)}
          onClick={() => onToggle(size)}
        >
          {size}
        </FilterChip>
      ))}
      {selectedSizes.length > 0 && onClear && (
        <FilterChip variant="ghost" onClick={onClear}>
          Clear
        </FilterChip>
      )}
    </FilterChipRow>
  )
}

// Back-compat alias so callers importing SizeFilterMenu still work until swapped.
export const SizeFilterMenu = SizeChips

interface GroupByChipsProps {
  groupBy: 'brand' | 'size'
  onChange: (next: 'brand' | 'size') => void
}

export function GroupByChips({ groupBy, onChange }: GroupByChipsProps) {
  return (
    <FilterChipRow label="Group">
      {(['brand', 'size'] as const).map((value) => (
        <FilterChip
          key={value}
          active={groupBy === value}
          onClick={() => onChange(value)}
        >
          {value === 'brand' ? 'Brand' : 'Size'}
        </FilterChip>
      ))}
    </FilterChipRow>
  )
}
