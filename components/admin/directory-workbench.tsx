import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DirectoryWorkbenchProps {
  /** List pane content (search + filters + rows). Always rendered. */
  list: ReactNode
  /** Detail pane content. The page resolves selection server-side and
   *  passes either the rendered workbench or `null`. The component
   *  shows `emptyDetail` when this is null. */
  detail: ReactNode
  /** Empty-state shown in the right pane on lg+ when `detail` is null. */
  emptyDetail: ReactNode
}

/**
 * Master/detail layout shared by Customers and Orders.
 *
 * Below `lg`: single column. Only the list renders. Each row in the
 * list should navigate to the standalone detail page on click.
 *
 * At `lg+`: 12-column grid. List occupies 5/12 (~42%); detail occupies
 * 7/12 (~58%). The detail pane is sticky-positioned within the grid
 * so it stays visible while the list scrolls.
 *
 * Server component on purpose — the page resolves `?id=` server-side
 * and passes the rendered detail subtree directly. This avoids the
 * RSC boundary issue (functions can't cross client boundaries).
 */
export function DirectoryWorkbench({
  list,
  detail,
  emptyDetail,
}: DirectoryWorkbenchProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">{list}</div>
      <div
        className={cn(
          'hidden lg:col-span-7 lg:block',
          'lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto',
        )}
      >
        {detail ?? emptyDetail}
      </div>
    </div>
  )
}
