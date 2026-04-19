'use client'

import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  createAction: () => void | Promise<void>
}

interface ReorderArrowsProps {
  onTop: () => void
  onUp: () => void
  onDown: () => void
  onBottom: () => void
  isFirst: boolean
  isLast: boolean
  disabled?: boolean
}

function ReorderArrows({ onTop, onUp, onDown, onBottom, isFirst, isLast, disabled }: ReorderArrowsProps) {
  return (
    <div className="inline-flex items-center gap-0.5" data-no-row-nav="true">
      <button
        type="button"
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        onClick={(event) => {
          event.stopPropagation()
          onTop()
        }}
        disabled={disabled || isFirst}
        aria-label="Move to top"
        title="Move to top"
      >
        <ArrowUpToLine className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        onClick={(event) => {
          event.stopPropagation()
          onUp()
        }}
        disabled={disabled || isFirst}
        aria-label="Move up"
        title="Move up"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        onClick={(event) => {
          event.stopPropagation()
          onDown()
        }}
        disabled={disabled || isLast}
        aria-label="Move down"
        title="Move down"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        onClick={(event) => {
          event.stopPropagation()
          onBottom()
        }}
        disabled={disabled || isLast}
        aria-label="Move to bottom"
        title="Move to bottom"
      >
        <ArrowDownToLine className="h-4 w-4" />
      </button>
    </div>
  )
}

export function PalletDealsManager({ deals, searchQuery, createAction }: PalletDealsManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState<PalletDealRow[]>(deals)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      {/* Toolbar: pen toggles edit mode; plus creates a new pallet via server action */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="icon"
          variant={editMode ? 'default' : 'outline'}
          aria-label={editMode ? 'Exit edit mode' : 'Enter edit mode'}
          title={editMode ? 'Exit edit mode' : 'Edit: show checkboxes + reorder arrows'}
          onClick={() => {
            setEditMode((prev) => {
              const next = !prev
              if (!next) setSelectedIds(new Set())
              return next
            })
          }}
        >
          {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </Button>
        <form action={createAction}>
          <Button
            type="submit"
            size="icon"
            aria-label="New pallet deal"
            title="New pallet deal"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {editMode && selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={deleteSelected}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}
      {searchIsActive && editMode && (
        <p className="text-xs text-muted-foreground">Clear search to enable reorder.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pallet deals.</p>
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
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{row.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.palletType} · {row.isActive ? 'Active' : 'Inactive'} · {formatCurrency(row.price)}
                  </div>
                </div>

                {editMode && !searchIsActive && (
                  <ReorderArrows
                    onTop={() => moveRowBy(row.id, 'top')}
                    onUp={() => moveRowBy(row.id, 'up')}
                    onDown={() => moveRowBy(row.id, 'down')}
                    onBottom={() => moveRowBy(row.id, 'bottom')}
                    isFirst={isFirst}
                    isLast={isLast}
                    disabled={busy}
                  />
                )}

                {editMode && (
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0"
                    checked={selectedIds.has(row.id)}
                    onChange={(event) => toggleSelected(row.id, event.target.checked)}
                    onClick={(event) => event.stopPropagation()}
                    disabled={busy}
                    aria-label={`Select ${row.title}`}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
