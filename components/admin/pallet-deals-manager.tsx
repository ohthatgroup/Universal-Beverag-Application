'use client'

import { useEffect, useMemo, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { moveSelectedRows, reorderByDrag } from '@/lib/reorder'
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
}

export function PalletDealsManager({ deals, searchQuery }: PalletDealsManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState<PalletDealRow[]>(deals)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [movePosition, setMovePosition] = useState('1')

  const searchIsActive = searchQuery.trim().length > 0

  useEffect(() => {
    setRows(deals)
    setSelectedIds(new Set())
  }, [deals])

  const selectedCount = selectedIds.size
  const allSelected = rows.length > 0 && selectedCount === rows.length
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
      const payload = await response.json().catch(() => null)
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
    setSelectedIds(new Set(rows.map((row) => row.id)))
  }

  const onDropRow = (targetId: string) => {
    if (busy || searchIsActive || !draggingId || draggingId === targetId) return
    const nextRows = reorderByDrag(rows, draggingId, targetId)
    if (nextRows === rows) return
    void applyOrder(nextRows)
  }

  const moveSelected = (mode: 'top' | 'bottom' | 'position') => {
    if (busy || searchIsActive || selectedRows.length === 0) return
    const desiredPosition = Number.isFinite(Number(movePosition)) ? Number(movePosition) : null
    const nextRows = moveSelectedRows(rows, selectedIds, mode, desiredPosition)
    if (nextRows === rows) return

    void applyOrder(nextRows)
  }

  const deleteSelected = async () => {
    if (busy || selectedRows.length === 0) return
    const confirmed = window.confirm(`Delete ${selectedRows.length} selected pallet deal(s)?`)
    if (!confirmed) return

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
      const payload = await response.json().catch(() => null)
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
    if (isInteractiveRowTarget(event.target)) return
    router.push(`/admin/catalog/pallets/${id}`)
  }

  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (isInteractiveRowTarget(event.target)) return
    event.preventDefault()
    router.push(`/admin/catalog/pallets/${id}`)
  }

  return (
    <div className="space-y-3">
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button type="button" size="sm" variant="outline" disabled={busy || searchIsActive} onClick={() => moveSelected('top')}>
            Move Top
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy || searchIsActive} onClick={() => moveSelected('bottom')}>
            Move Bottom
          </Button>
          <Input
            value={movePosition}
            onChange={(event) => setMovePosition(event.target.value)}
            className="h-8 w-20"
            inputMode="numeric"
            placeholder="Pos"
            disabled={busy || searchIsActive}
          />
          <Button type="button" size="sm" variant="outline" disabled={busy || searchIsActive} onClick={() => moveSelected('position')}>
            Move To
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={deleteSelected}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {searchIsActive && (
        <p className="text-xs text-muted-foreground">Clear search to enable drag reorder and move actions.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pallet deals.</p>
      ) : (
        <>
          <div className="space-y-0 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex cursor-pointer items-start gap-2 border-b py-3 last:border-0"
                onClick={(event) => onRowClick(event, row.id)}
                onKeyDown={(event) => onRowKeyDown(event, row.id)}
                role="button"
                tabIndex={0}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selectedIds.has(row.id)}
                  onChange={(event) => toggleSelected(row.id, event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{row.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.palletType} - {row.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(row.price)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 px-2 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => toggleAll(event.target.checked)}
                      disabled={busy}
                    />
                  </th>
                  <th className="w-10 px-2 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    draggable={!busy && !searchIsActive}
                    onDragStart={() => setDraggingId(row.id)}
                    onDragOver={(event: DragEvent<HTMLTableRowElement>) => event.preventDefault()}
                    onDrop={() => onDropRow(row.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`cursor-pointer border-b last:border-0 hover:bg-muted/30 ${selectedIds.has(row.id) ? 'bg-muted/30' : ''}`}
                    onClick={(event) => onRowClick(event, row.id)}
                    onKeyDown={(event) => onRowKeyDown(event, row.id)}
                    tabIndex={0}
                    role="button"
                  >
                    <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={(event) => toggleSelected(row.id, event.target.checked)}
                      />
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      <GripVertical className="h-4 w-4" data-no-row-nav="true" />
                    </td>
                    <td className="px-4 py-3 font-medium">{row.title}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{row.palletType}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(row.price)}</td>
                    <td className="px-4 py-3">
                      <span className={row.isActive ? 'text-xs text-green-600' : 'text-xs text-muted-foreground'}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
