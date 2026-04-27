import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui/page-header'

export interface DomainPageProps {
  title: string
  description?: string
  /** Header right-side actions (e.g. "+ New customer" button). */
  actions?: ReactNode
  /** Open-actions / next-step prompt groups. */
  prompts?: ReactNode
  /** The domain's main content (table, list). The table owns its own
   *  search input via its `search?: ReactNode` prop — this primitive
   *  no longer takes a search slot. */
  table: ReactNode
}

/**
 * Standard top-level admin page anatomy: header (with actions on the
 * right), prompt groups, then the table. This used to host a search
 * slot + a focus-collapse state machine; both have been retired in
 * favor of letting the table manager own its own search input, which
 * matches what Catalog / Brands / Presets / Staff already do.
 */
export function DomainPage({
  title,
  description,
  actions,
  prompts,
  table,
}: DomainPageProps) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} actions={actions} />
      {prompts}
      {table}
    </div>
  )
}
