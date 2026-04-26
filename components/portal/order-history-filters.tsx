'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface OrderHistoryFiltersProps {
  token: string
  /** Active filter slug. */
  active: string
}

const FILTERS = [
  { slug: 'all', label: 'All' },
  { slug: 'submitted', label: 'Submitted' },
  { slug: 'delivered', label: 'Delivered' },
] as const

export function OrderHistoryFilters({
  token,
  active,
}: OrderHistoryFiltersProps) {
  const base = `/portal/${token}/orders`
  return (
    <div
      role="tablist"
      aria-label="Filter orders by status"
      className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
    >
      {FILTERS.map((filter) => {
        const isActive = active === filter.slug
        const href = filter.slug === 'all' ? base : `${base}?status=${filter.slug}`
        return (
          <Link
            key={filter.slug}
            role="tab"
            aria-selected={isActive}
            href={href}
            className={cn(
              'inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow'
                : 'hover:text-foreground',
            )}
          >
            {filter.label}
          </Link>
        )
      })}
    </div>
  )
}
