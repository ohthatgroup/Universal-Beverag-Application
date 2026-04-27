'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface SegmentedOption {
  value: string
  label: string
}

interface SegmentedFiltersProps {
  /** URL param this filter writes to. */
  paramKey: string
  /** When the URL has no value for `paramKey`, this option is active. */
  defaultValue?: string
  options: SegmentedOption[]
  /** Optional aria-label for the segmented group. */
  label?: string
}

/**
 * Bare-type segmented filter bar. Active option = `text-foreground`
 * with a thin underline; inactive = `text-muted-foreground/70` with
 * underline on hover.
 *
 * Each option is a `<Link>` that updates the URL's `paramKey`. Other
 * params (q, id) are preserved so filtering doesn't drop a selected
 * row's `?id`. Switching filter clears `id` since the filtered result
 * may not include the previously-selected row.
 */
export function SegmentedFilters({
  paramKey,
  defaultValue = 'all',
  options,
  label,
}: SegmentedFiltersProps) {
  const pathname = usePathname()
  const params = useSearchParams()
  const current = params.get(paramKey) ?? defaultValue

  const buildHref = (value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === defaultValue) next.delete(paramKey)
    else next.set(paramKey, value)
    next.delete('id')
    const qs = next.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-baseline gap-x-5 gap-y-2 px-1 text-[13px]"
    >
      {options.map((opt) => {
        const isActive = current === opt.value
        return (
          <Link
            key={opt.value}
            href={buildHref(opt.value)}
            scroll={false}
            className={cn(
              'underline-offset-[6px] transition-colors',
              isActive
                ? 'font-medium text-foreground underline'
                : 'text-muted-foreground/70 hover:text-foreground hover:underline',
            )}
          >
            {opt.label}
          </Link>
        )
      })}
    </nav>
  )
}
