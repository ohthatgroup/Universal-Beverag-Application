'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface OrderListItem {
  id: string
  customerName: string
  /** "Delivers May 15, 3 items, $79", "Draft, 11 days idle", etc. */
  contextLine: string
  /** "May 15", "today", "11d idle" */
  activityHint: string | null
  status: 'draft' | 'submitted' | 'delivered' | 'cancelled'
}

interface OrderListRowProps {
  order: OrderListItem
  selectedId?: string | null
}

/**
 * One order row in the directory list. Mirrors `<CustomerListRow>`:
 *   - Below `lg`: navigates to `/admin/orders/<id>`.
 *   - At `lg+`: updates the URL `?id=<uuid>` so the parent
 *     `<DirectoryWorkbench>` shows the order workbench in the right pane.
 */
export function OrderListRow({ order, selectedId }: OrderListRowProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const isSelected = selectedId === order.id

  const navigate = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      router.push(`/admin/orders/${order.id}`)
      return
    }
    const next = new URLSearchParams(params.toString())
    next.set('id', order.id)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
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
          {order.customerName}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
          {order.contextLine}
        </p>
      </div>
      {order.activityHint && (
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
          {order.activityHint}
        </span>
      )}
    </button>
  )
}
