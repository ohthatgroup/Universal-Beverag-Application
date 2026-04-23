'use client'

import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { BulkActionBar } from '@/components/admin/bulk-action-bar'
import { CopyUrlButton } from '@/components/admin/copy-url-button'
import { CustomerTagFilterStrip } from '@/components/admin/customer-tag-filter-strip'
import { ListToolbar } from '@/components/admin/list-toolbar'
import { RowCheckbox } from '@/components/admin/row-actions'
import { Badge } from '@/components/ui/badge'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import { EmptyState } from '@/components/ui/empty-state'
import { isInteractiveRowTarget } from '@/lib/row-navigation'

export interface CustomerListRow {
  id: string
  businessName: string
  email: string | null
  phone: string | null
  portalUrl: string | null
  tags: string[]
}

interface CustomersTableManagerProps {
  rows: CustomerListRow[]
  searchQuery?: string
  search?: ReactNode
}

export function CustomersTableManager({
  rows: initialRows,
  searchQuery = '',
  search,
}: CustomersTableManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState<CustomerListRow[]>(initialRows)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [activeTags, setActiveTags] = useState<string[]>([])

  useEffect(() => {
    setRows(initialRows)
    setSelectedIds(new Set())
  }, [initialRows])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) for (const t of r.tags) set.add(t)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const visibleRows = useMemo(() => {
    const term = searchQuery.trim().toLowerCase()
    let out = rows
    if (activeTags.length) {
      out = out.filter((r) => activeTags.every((t) => r.tags.includes(t)))
    }
    if (term) {
      out = out.filter((r) =>
        [r.businessName, r.email, r.phone]
          .map((v) => (v ?? '').toLowerCase())
          .some((v) => v.includes(term))
      )
    }
    return out
  }, [rows, searchQuery, activeTags])

  const selectedCount = selectedIds.size
  const allSelected = visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.id))

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(visibleRows.map((row) => row.id)))
  }

  const requestDeleteSelected = () => {
    if (busy || selectedIds.size === 0) return
    setConfirmDeleteOpen(true)
  }

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (busy || ids.length === 0) return

    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to delete selected customers')
      }

      setRows((prev) => prev.filter((row) => !selectedIds.has(row.id)))
      setSelectedIds(new Set())
      router.refresh()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Failed to delete selected customers'
      )
    } finally {
      setBusy(false)
    }
  }

  const onRowClick = (event: MouseEvent<HTMLElement>, id: string) => {
    if (isInteractiveRowTarget(event.target)) return
    router.push(`/admin/customers/${id}`)
  }

  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (isInteractiveRowTarget(event.target)) return
    event.preventDefault()
    router.push(`/admin/customers/${id}`)
  }

  return (
    <div className="space-y-3">
      <ListToolbar
        search={search}
        editMode={editMode}
        onEditModeChange={(next) => {
          setEditMode(next)
          if (!next) setSelectedIds(new Set())
        }}
        editTitle={editMode ? 'Exit edit mode' : 'Edit: show checkboxes'}
      />

      <CustomerTagFilterStrip
        allTags={allTags}
        active={activeTags}
        onChange={setActiveTags}
      />

      {editMode && (
        <BulkActionBar
          selectedCount={selectedCount}
          onDelete={requestDeleteSelected}
          onClear={() => setSelectedIds(new Set())}
          busy={busy}
        />
      )}

      <ConfirmSheet
        open={confirmDeleteOpen}
        onOpenChange={(next) => {
          if (!busy) setConfirmDeleteOpen(next)
        }}
        title={`Delete ${selectedCount} customer${selectedCount === 1 ? '' : 's'}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={busy}
        destructive
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          void deleteSelected()
        }}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {visibleRows.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matches' : 'No customers yet'}
          description={
            searchQuery
              ? `Nothing matched "${searchQuery}".`
              : 'Add your first customer to get started.'
          }
        />
      ) : (
        <>
          <div className="space-y-0 md:hidden">
            {visibleRows.map((row) => {
              const checked = selectedIds.has(row.id)
              return (
                <div
                  key={row.id}
                  className={`border-b py-3 last:border-0 ${checked ? 'bg-muted/30' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {editMode && (
                      <RowCheckbox
                        label={`Select ${row.businessName}`}
                        className="mt-1"
                        checked={checked}
                        onChange={(event) => toggleSelected(row.id, event.target.checked)}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => router.push(`/admin/customers/${row.id}`)}
                      >
                        <div className="text-sm font-medium">{row.businessName}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.email ?? 'No email'}
                          {row.phone && ` · ${row.phone}`}
                        </div>
                      </button>
                      {row.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {row.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {row.portalUrl ? (
                        <div className="mt-2">
                          <CopyUrlButton url={row.portalUrl} label="Copy URL" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {editMode && (
                    <th className="w-10 px-2 py-3 text-left">
                      <RowCheckbox
                        label="Select all"
                        checked={allSelected}
                        onChange={(event) => toggleAll(event.target.checked)}
                        disabled={busy}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-medium">Business name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Tags</th>
                  <th className="px-4 py-3 text-right font-medium">Portal</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const checked = selectedIds.has(row.id)
                  return (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-b last:border-0 hover:bg-muted/30 ${checked ? 'bg-muted/30' : ''}`}
                      onClick={(event) => onRowClick(event, row.id)}
                      onKeyDown={(event) => onRowKeyDown(event, row.id)}
                      tabIndex={0}
                      role="button"
                    >
                      {editMode && (
                        <td className="px-2 py-3">
                          <RowCheckbox
                            label={`Select ${row.businessName}`}
                            checked={checked}
                            onChange={(event) => toggleSelected(row.id, event.target.checked)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium">{row.businessName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.email ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        {row.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.portalUrl ? <CopyUrlButton url={row.portalUrl} label="Copy URL" /> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
