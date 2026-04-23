'use client'

import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { AdminFab } from '@/components/admin/admin-fab'
import { BulkActionBar } from '@/components/admin/bulk-action-bar'
import { ListToolbar } from '@/components/admin/list-toolbar'
import { RowActions, RowCheckbox, RowReorderArrows } from '@/components/admin/row-actions'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import { EmptyState } from '@/components/ui/empty-state'
import { PalletStatusDot } from '@/components/ui/status-dot'
import { isInteractiveRowTarget } from '@/lib/row-navigation'
import { formatCurrency } from '@/lib/utils'

export interface PalletDealRow {
  id: string
  title: string
  palletType: 'single' | 'mixed'
  price: number
  isActive: boolean
}

interface PalletDealsManagerProps {
  deals: PalletDealRow[]
  searchQuery: string
  /** Optional search input rendered inside the toolbar row. */
  search?: ReactNode
}

export function PalletDealsManager({ deals, searchQuery, search }: PalletDealsManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState<PalletDealRow[]>(deals)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const createDeal = async () => {
    if (creating) return
    setCreating(true)
    try {
      const response = await fetch('/api/admin/pallet-deals', { method: 'POST' })
      const payload = (await response.json().catch(() => null)) as
        | { data?: { palletDealId?: string }; error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to create pallet deal')
      }
      const palletDealId = payload?.data?.palletDealId
      if (!palletDealId) throw new Error('Pallet deal was created without an id')
      router.push(`/admin/catalog/pallets/${palletDealId}`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create pallet deal')
      setCreating(false)
    }
  }

  const searchIsActive = searchQuery.trim().length > 0

  useEffect(() => {
    setRows(deals)
    setSelectedIds(new Set())
  }, [deals])

  const selectedCount = selectedIds.size
  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.has(row.id)), [rows, selectedIds])

  const applyOrder = async (nextRows: PalletDealRow[]) => {
    const previousRows = rows
    setRows(nextRows)
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/pallet-deals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder',
          orderedIds: nextRows.map((row) => row.id),
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to save order')
      }
      router.refresh()
    } catch (applyError) {
      setRows(previousRows)
      setError(applyError instanceof Error ? applyError.message : 'Failed to save order')
    } finally {
      setBusy(false)
    }
  }

  const moveRowBy = (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (busy || searchIsActive) return
    const index = rows.findIndex((row) => row.id === id)
    if (index < 0) return
    const nextRows = [...rows]
    const [moved] = nextRows.splice(index, 1)
    let destination: number
    switch (direction) {
      case 'top':
        destination = 0
        break
      case 'bottom':
        destination = nextRows.length
        break
      case 'up':
        destination = Math.max(0, index - 1)
        break
      case 'down':
        destination = Math.min(nextRows.length, index + 1)
        break
    }
    nextRows.splice(destination, 0, moved)
    void applyOrder(nextRows)
  }

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const requestDeleteSelected = () => {
    if (busy || selectedRows.length === 0) return
    setConfirmDeleteOpen(true)
  }

  const deleteSelected = async () => {
    if (busy || selectedRows.length === 0) return
    setBusy(true)
    setError(null)
    const ids = selectedRows.map((row) => row.id)
    try {
      const response = await fetch('/api/admin/pallet-deals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          ids,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to delete deals')
      }
      setRows((prev) => prev.filter((row) => !ids.includes(row.id)))
      setSelectedIds(new Set())
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete deals')
    } finally {
      setBusy(false)
    }
  }

  const onRowClick = (event: MouseEvent<HTMLElement>, id: string) => {
    if (editMode) return
    if (isInteractiveRowTarget(event.target)) return
    router.push(`/admin/catalog/pallets/${id}`)
  }

  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (editMode) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (isInteractiveRowTarget(event.target)) return
    event.preventDefault()
    router.push(`/admin/catalog/pallets/${id}`)
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        editMode={editMode}
        onEditModeChange={(next) => {
          setEditMode(next)
          if (!next) setSelectedIds(new Set())
        }}
        editTitle={editMode ? 'Exit edit mode' : 'Edit: show checkboxes + reorder arrows'}
        onAdd={() => void createDeal()}
        addLabel="New pallet deal"
      />

      <AdminFab
        icon={<Plus className="h-6 w-6" />}
        label="New pallet deal"
        onClick={() => void createDeal()}
        disabled={creating}
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
        title={`Delete ${selectedCount} pallet deal${selectedCount === 1 ? '' : 's'}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={busy}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          void deleteSelected()
        }}
      />
      {searchIsActive && editMode && (
        <p className="text-xs text-muted-foreground">Clear search to enable reorder.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows.length === 0 ? (
        <EmptyState title="No pallet deals yet" description="Create a pallet deal to offer bundled discounts." />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {rows.map((row, index) => {
            const isFirst = index === 0
            const isLast = index === rows.length - 1
            return (
              <li
                key={row.id}
                className={`flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-muted/30 ${selectedIds.has(row.id) ? 'bg-muted/30' : ''}`}
                onClick={(event) => onRowClick(event, row.id)}
                onKeyDown={(event) => onRowKeyDown(event, row.id)}
                role="button"
                tabIndex={0}
              >
                {editMode && (
                  <RowCheckbox
                    label={`Select ${row.title}`}
                    checked={selectedIds.has(row.id)}
                    onChange={(event) => toggleSelected(row.id, event.target.checked)}
                    disabled={busy}
                  />
                )}
                <PalletStatusDot isActive={row.isActive} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{row.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.palletType} · {formatCurrency(row.price)}
                  </div>
                </div>

                <RowActions
                  reorder={
                    editMode && !searchIsActive ? (
                      <RowReorderArrows
                        onTop={() => moveRowBy(row.id, 'top')}
                        onUp={() => moveRowBy(row.id, 'up')}
                        onDown={() => moveRowBy(row.id, 'down')}
                        onBottom={() => moveRowBy(row.id, 'bottom')}
                        isFirst={isFirst}
                        isLast={isLast}
                        disabled={busy}
                      />
                    ) : null
                  }
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
