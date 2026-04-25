'use client'

import { cn } from '@/lib/utils'

interface FilterChipProps {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  // For non-toggle chips like a "Clear" reset action — same shape, lighter
  // weight, won't read as an active filter.
  variant?: 'toggle' | 'ghost'
  className?: string
}

// Canonical chip used everywhere on the customer surface — pill switchers,
// brand/size filters, "Clear" actions, etc. Active state is the primary
// fill, matching the commitment color used by the cart bar's CTA so
// "in-effect" reads consistently across the page.
export function FilterChip({
  active = false,
  onClick,
  children,
  variant = 'toggle',
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={variant === 'toggle' ? active : undefined}
      className={cn(
        'inline-flex flex-none items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        active
          ? 'bg-primary text-primary-foreground'
          : variant === 'ghost'
            ? 'text-muted-foreground hover:text-foreground'
            : 'border border-border bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

interface FilterChipRowProps {
  label?: string
  children: React.ReactNode
  className?: string
}

// Small wrapper that renders a labeled row of chips. Keeps spacing
// consistent across SizeChips, BrandChips, and any future facet.
export function FilterChipRow({ label, children, className }: FilterChipRowProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
