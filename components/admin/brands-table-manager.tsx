'use client'

import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { moveSelectedRows, reorderByDrag } from '@/lib/reorder'

export interface BrandTableRow {
  id: string
  name: string
  logoUrl: string | null
}

interface BrandApiRow {
  id: string
  name: string
  logo_url?: string | null
  logoUrl?: string | null
}

interface BrandRowState extends BrandTableRow {
  draftName: string
  draftLogoUrl: string | null
}

interface BrandsTableManagerProps {
  brands: BrandTableRow[]
  searchQuery: string
}

function isRowDirty(row: BrandRowState) {
  const normalizedDraftName = row.draftName.trim()
  return normalizedDraftName !== row.name || (row.draftLogoUrl ?? null) !== (row.logoUrl ?? null)
}

function toRowState(row: BrandTableRow): BrandRowState {
  return {
    ...row,
    draftName: row.name,
    draftLogoUrl: row.logoUrl,
  }
}

function normalizeBrandApiRow(row: BrandApiRow): BrandTableRow {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logoUrl ?? row.logo_url ?? null,
  }
}

export function BrandsTableManager({ brands, searchQuery }: BrandsTableManagerProps) {
  const [rows, setRows] = useState<BrandRowState[]>(brands.map(toRowState))
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [createLogoUrl, setCreateLogoUrl] = useState<string | null>(null)
  const [movePosition, setMovePosition] = useState('1')

  const searchIsActive = searchQuery.trim().length > 0

  useEffect(() => {
    setRows(brands.map(toRowState))
    setSelectedIds(new Set())
  }, [brands])

  const dirtyCount = useMemo(
    () => rows.filter((row) => isRowDirty(row)).length,
    [rows]
  )
  const selectedCount = selectedIds.size
  const allSelected = rows.length > 0 && selectedCount === rows.length
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds]
  )

  const updateRow = (id: string, patch: Partial<BrandRowState>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    )
  }

  const saveRow = async (row: BrandRowState) => {
    if (savingIds.has(row.id)) return

    const name = row.draftName.trim()
    if (!name) {
      setError('Brand name is required')
      return
    }

    setError(null)
    setSavingIds((prev) => new Set(prev).add(row.id))
    try {
      const response = await fetch(`/api/admin/brands/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          logoUrl: row.draftLogoUrl,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { data?: BrandApiRow; error?: { message?: string } }
        | null

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to save brand')
      }

      const saved = normalizeBrandApiRow(payload.data)
      updateRow(row.id, {
        name: saved.name,
        logoUrl: saved.logoUrl,
        draftName: saved.name,
        draftLogoUrl: saved.logoUrl,
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save brand')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }

  const applyOrder = async (nextRows: BrandRowState[]) => {
    const previousRows = rows
    setRows(nextRows)
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/brands/bulk', {
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
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
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
    const confirmed = window.confirm(`Delete ${selectedRows.length} selected brand(s)?`)
    if (!confirmed) return

    setBusy(true)
    setError(null)
    const ids = selectedRows.map((row) => row.id)
    try {
      const response = await fetch('/api/admin/brands/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          ids,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to delete brands')
      }
      setRows((prev) => prev.filter((row) => !ids.includes(row.id)))
      setSelectedIds(new Set())
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete brands')
    } finally {
      setBusy(false)
    }
  }

  const deleteBrand = async (row: BrandRowState) => {
    if (busy || deletingIds.has(row.id)) return
    const confirmed = window.confirm(`Delete brand "${row.name}"?`)
    if (!confirmed) return

    setError(null)
    setDeletingIds((prev) => new Set(prev).add(row.id))
    try {
      const response = await fetch(`/api/admin/brands/${row.id}`, {
        method: 'DELETE',
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to delete brand')
      }
      setRows((prev) => prev.filter((entry) => entry.id !== row.id))
      setSelectedIds((prev) => {
        if (!prev.has(row.id)) return prev
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete brand')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }

  const createBrand = async () => {
    if (creating) return
    const name = createName.trim()
    if (!name) {
      setError('Brand name is required')
      return
    }

    setError(null)
    setCreating(true)
    try {
      const response = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          logoUrl: createLogoUrl,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { data?: BrandApiRow; error?: { message?: string } }
        | null
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to create brand')
      }

      const created = normalizeBrandApiRow(payload.data)
      setRows((prev) => [...prev, toRowState(created)])
      setCreateName('')
      setCreateLogoUrl(null)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create brand')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:max-w-xs">
            <div className="text-xs font-medium text-muted-foreground">Name</div>
            <Input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="New brand"
              className="mt-1 h-9"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">File</div>
            <div className="mt-1">
              <ImageUpload
                value={createLogoUrl}
                onChange={setCreateLogoUrl}
                folder="brands"
                compact
                iconOnly
              />
            </div>
          </div>
          <Button type="button" onClick={createBrand} disabled={creating}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {creating ? 'Creating...' : 'Add Brand'}
          </Button>
        </div>
      </div>

      {dirtyCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {dirtyCount} row{dirtyCount === 1 ? '' : 's'} with unsaved changes.
        </p>
      )}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || searchIsActive}
            onClick={() => moveSelected('top')}
          >
            Move Top
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || searchIsActive}
            onClick={() => moveSelected('bottom')}
          >
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || searchIsActive}
            onClick={() => moveSelected('position')}
          >
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
        <p className="text-sm text-muted-foreground">No brands found.</p>
      ) : (
        <>
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
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">File</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const dirty = isRowDirty(row)
                  const fileUrl = row.draftLogoUrl ?? row.logoUrl
                  const saving = savingIds.has(row.id)
                  const deleting = deletingIds.has(row.id)

                  return (
                    <tr
                      key={row.id}
                      draggable={!busy && !searchIsActive}
                      onDragStart={() => setDraggingId(row.id)}
                      onDragOver={(event: DragEvent<HTMLTableRowElement>) => event.preventDefault()}
                      onDrop={() => onDropRow(row.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`border-b last:border-0 hover:bg-muted/30 ${selectedIds.has(row.id) ? 'bg-muted/30' : ''}`}
                    >
                      <td className="px-2 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={(event) => toggleSelected(row.id, event.target.checked)}
                          disabled={busy}
                        />
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        <GripVertical className="h-4 w-4" data-no-row-nav="true" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.draftName}
                            onChange={(event) => updateRow(row.id, { draftName: event.target.value })}
                            className="h-9 max-w-xs"
                          />
                          {dirty ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => saveRow(row)}
                              disabled={saving}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ImageUpload
                            value={row.draftLogoUrl}
                            onChange={(value) => updateRow(row.id, { draftLogoUrl: value })}
                            folder="brands"
                            compact
                            iconOnly
                          />
                          {fileUrl ? (
                            <>
                              <Button asChild type="button" size="sm" variant="outline">
                                <a href={fileUrl} target="_blank" rel="noreferrer">
                                  View File
                                </a>
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">No file</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteBrand(row)}
                          disabled={busy || deleting}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {deleting ? 'Deleting...' : 'Delete Brand'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row) => {
              const dirty = isRowDirty(row)
              const fileUrl = row.draftLogoUrl ?? row.logoUrl
              const saving = savingIds.has(row.id)
              const deleting = deletingIds.has(row.id)

              return (
                <div key={row.id} className="rounded-lg border p-3 space-y-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedIds.has(row.id)}
                      onChange={(event) => toggleSelected(row.id, event.target.checked)}
                      disabled={busy}
                    />
                    Select for bulk actions
                  </label>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Name</div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={row.draftName}
                        onChange={(event) => updateRow(row.id, { draftName: event.target.value })}
                        className="h-9"
                      />
                      {dirty ? (
                        <Button type="button" size="sm" onClick={() => saveRow(row)} disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">File</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ImageUpload
                        value={row.draftLogoUrl}
                        onChange={(value) => updateRow(row.id, { draftLogoUrl: value })}
                        folder="brands"
                        compact
                        iconOnly
                      />
                      {fileUrl ? (
                        <>
                          <Button asChild type="button" size="sm" variant="outline">
                            <a href={fileUrl} target="_blank" rel="noreferrer">
                              View File
                            </a>
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No file</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteBrand(row)}
                      disabled={busy || deleting}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {deleting ? 'Deleting...' : 'Delete Brand'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
