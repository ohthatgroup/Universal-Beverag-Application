'use client'

import type { Brand } from '@/lib/types'
import { cn } from '@/lib/utils'

const chipBase =
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap'
const chipActive = 'border-accent bg-accent text-accent-foreground'
const chipIdle = 'border-border bg-background text-foreground hover:border-foreground/40'

interface FacetRowProps {
  label: string
  children: React.ReactNode
}

function FacetRow({ label, children }: FacetRowProps) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

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
    <FacetRow label="Brand">
      {brands.map((brand) => {
        const active = selectedSet.has(brand.id)
        return (
          <button
            key={brand.id}
            type="button"
            onClick={() => onToggle(brand.id)}
            className={cn(chipBase, active ? chipActive : chipIdle)}
          >
            {brand.name}
          </button>
        )
      })}
      {selectedBrandIds.length > 0 && onClear && (
        <button
          type="button"
          onClick={onClear}
          className={cn(chipBase, chipIdle, 'text-muted-foreground')}
        >
          Clear
        </button>
      )}
    </FacetRow>
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
    <FacetRow label="Size">
      {sizes.map((size) => {
        const active = selectedSet.has(size)
        return (
          <button
            key={size}
            type="button"
            onClick={() => onToggle(size)}
            className={cn(chipBase, active ? chipActive : chipIdle)}
          >
            {size}
          </button>
        )
      })}
      {selectedSizes.length > 0 && onClear && (
        <button
          type="button"
          onClick={onClear}
          className={cn(chipBase, chipIdle, 'text-muted-foreground')}
        >
          Clear
        </button>
      )}
    </FacetRow>
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
    <FacetRow label="Group">
      {(['brand', 'size'] as const).map((value) => {
        const active = groupBy === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={cn(chipBase, active ? chipActive : chipIdle)}
          >
            {value === 'brand' ? 'Brand' : 'Size'}
          </button>
        )
      })}
    </FacetRow>
  )
}
