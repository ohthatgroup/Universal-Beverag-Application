'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface CustomerListItem {
  id: string
  businessName: string
  /** Pre-rendered secondary line: e.g. "Group: Pubs · 12d since last order". */
  contextLine: string | null
  /** Pre-rendered short timeframe: "12d", "yesterday", "—". */
  activityHint: string | null
}

interface CustomerListRowProps {
  customer: CustomerListItem
  selectedId?: string | null
}

/**
 * One customer row inside the directory list. Behavior is responsive:
 *
 *   - Below `lg`: clicking navigates to `/admin/customers/<id>` —
 *     the standalone page (no side pane on mobile).
 *   - At `lg+`: clicking updates the URL to `?id=<uuid>` so the parent
 *     `<DirectoryWorkbench>` shows the workbench in the right pane.
 *
 * Implementation: a single `<button>` that branches on viewport width
 * via `window.matchMedia` at click-time. Avoids a flash of incorrect
 * navigation across breakpoints.
 */
export function CustomerListRow({ customer, selectedId }: CustomerListRowProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const isSelected = selectedId === customer.id

  const navigate = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      router.push(`/admin/customers/${customer.id}`)
      return
    }
    const next = new URLSearchParams(params.toString())
    next.set('id', customer.id)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    // App Router doesn't always re-run server components on a soft
    // searchParams replace — refresh forces the side pane to re-fetch
    // with the new id.
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={navigate}
      className={cn(
        'flex w-full items-start justify-between gap-3 border-b border-foreground/10 px-2 py-3 text-left transition-colors last:border-0',
        'hover:bg-muted/40',
        isSelected && 'bg-muted/60',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium leading-tight text-foreground">
          {customer.businessName}
        </p>
        {customer.contextLine && (
          <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
            {customer.contextLine}
          </p>
        )}
      </div>
      {customer.activityHint && (
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
          {customer.activityHint}
        </span>
      )}
    </button>
  )
}
