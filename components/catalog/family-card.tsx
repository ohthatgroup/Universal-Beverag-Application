'use client'

import type { FamilyDefinition } from '@/lib/catalog/families'
import { cn } from '@/lib/utils'

interface FamilyCardProps {
  family: FamilyDefinition
  productCount: number
  inOrderCount: number
  onSelect: () => void
}

// FamilyCard sized for a 2-col mobile grid. Compact horizontal layout:
//   ┌─────────────────────────┐
//   │  [icon]  Soda      [3]  │
//   │          227 products    │
//   └─────────────────────────┘
// Icon is the family color/silhouette so the user finds the family
// pre-attentively. Count pill (top-right) appears only when in-order > 0.
export function FamilyCard({
  family,
  productCount,
  inOrderCount,
  onSelect,
}: FamilyCardProps) {
  const Icon = family.icon
  const hasItems = inOrderCount > 0
  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
    >
      <span
        className={cn(
          'flex h-11 w-11 flex-none items-center justify-center rounded-xl',
          family.iconBg,
        )}
      >
        <Icon className={cn('h-5 w-5', family.iconFg)} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight">
          {family.label}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
          {productCount} {productCount === 1 ? 'product' : 'products'}
        </span>
      </span>

      {hasItems && (
        <span className="absolute right-2 top-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {inOrderCount}
        </span>
      )}
    </button>
  )
}
