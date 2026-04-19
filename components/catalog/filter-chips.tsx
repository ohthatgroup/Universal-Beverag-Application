'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
    <div className="flex items-start gap-3">
      <span className="mt-1.5 w-12 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-1 flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

interface BrandChipsProps {
  brands: Brand[]
  selectedBrandId: string | null
  onSelect: (brandId: string | null) => void
  collapseAfter?: number
}

export function BrandChips({
  brands,
  selectedBrandId,
  onSelect,
  collapseAfter = 8,
}: BrandChipsProps) {
  const [expanded, setExpanded] = useState(false)
  if (brands.length === 0) return null

  const needsCollapse = brands.length > collapseAfter
  const selectedIsHidden =
    needsCollapse &&
    !expanded &&
    selectedBrandId !== null &&
    brands.findIndex((b) => b.id === selectedBrandId) >= collapseAfter

  const visible = needsCollapse && !expanded && !selectedIsHidden
    ? brands.slice(0, collapseAfter)
    : brands

  const hiddenCount = brands.length - collapseAfter

  return (
    <FacetRow label="Brand">
      {visible.map((brand) => {
        const active = brand.id === selectedBrandId
        return (
          <button
            key={brand.id}
            type="button"
            onClick={() => onSelect(active ? null : brand.id)}
            className={cn(chipBase, active ? chipActive : chipIdle)}
          >
            {brand.name}
          </button>
        )
      })}
      {needsCollapse && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(chipBase, chipIdle, 'gap-1')}
        >
          +{hiddenCount} more
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </FacetRow>
  )
}

interface SizeChipsProps {
  sizes: string[]
  selectedSize: string | null
  onSelect: (size: string | null) => void
  collapseAfter?: number
}

export function SizeChips({
  sizes,
  selectedSize,
  onSelect,
  collapseAfter = 10,
}: SizeChipsProps) {
  const [expanded, setExpanded] = useState(false)
  if (sizes.length === 0) return null

  const needsCollapse = sizes.length > collapseAfter
  const selectedIsHidden =
    needsCollapse &&
    !expanded &&
    selectedSize !== null &&
    sizes.indexOf(selectedSize) >= collapseAfter

  const visible = needsCollapse && !expanded && !selectedIsHidden
    ? sizes.slice(0, collapseAfter)
    : sizes

  const hiddenCount = sizes.length - collapseAfter

  return (
    <FacetRow label="Size">
      {visible.map((size) => {
        const active = size === selectedSize
        return (
          <button
            key={size}
            type="button"
            onClick={() => onSelect(active ? null : size)}
            className={cn(chipBase, active ? chipActive : chipIdle)}
          >
            {size}
          </button>
        )
      })}
      {needsCollapse && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(chipBase, chipIdle, 'gap-1')}
        >
          +{hiddenCount} more
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </FacetRow>
  )
}

// Back-compat alias so callers importing SizeFilterMenu still work until swapped.
export const SizeFilterMenu = SizeChips
