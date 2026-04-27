'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CatalogRow, type CatalogRowData } from '@/components/admin/catalog-row'
import { ListToolbar } from '@/components/admin/list-toolbar'
import { EmptyState } from '@/components/ui/empty-state'

interface CatalogRowsManagerProps {
  rows: CatalogRowData[]
  searchQuery?: string
  search?: ReactNode
  filters?: ReactNode
}

/**
 * Manager around the catalog row layout. Same external contract as the
 * old `<CatalogProductsManager>` (rows + searchQuery + search slot) but
 * renders rows via `<CatalogRow>` instead of a table.
 *
 * Edit-mode + bulk-delete are intentionally dropped in v1 — start clean
 * and only port them back if they prove load-bearing.
 */
export function CatalogRowsManager({
  rows: initialRows,
  searchQuery = '',
  search,
  filters,
}: CatalogRowsManagerProps) {
  const [rows, setRows] = useState<CatalogRowData[]>(initialRows)

  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  const visibleRows = useMemo(() => {
    const term = searchQuery.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) =>
      [r.title, r.brandName ?? '', r.packLabel ?? '']
        .map((v) => v.toLowerCase())
        .some((v) => v.includes(term)),
    )
  }, [rows, searchQuery])

  return (
    <div className="space-y-3">
      <ListToolbar search={search} />
      {filters}

      {visibleRows.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matches' : 'No products yet'}
          description={
            searchQuery
              ? `Nothing matched "${searchQuery}".`
              : 'Add your first product to get started.'
          }
        />
      ) : (
        <ul className="space-y-0 rounded-lg border border-foreground/10">
          {visibleRows.map((row) => (
            <li key={row.id}>
              <CatalogRow row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
