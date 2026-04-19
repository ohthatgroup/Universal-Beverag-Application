'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [createLogoUrl, setCreateLogoUrl] = useState<string | null>(null)

  const searchIsActive = searchQuery.trim().length > 0

  useEffect(() => {
    setRows(brands.map(toRowState))
    setSelectedIds(new Set())
  }, [brands])

  const selectedCount = selectedIds.size
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
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
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
      setCreateOpen(false)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create brand')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: pen toggles edit mode; plus opens create modal */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="icon"
          variant={editMode ? 'default' : 'outline'}
          aria-label={editMode ? 'Exit edit mode' : 'Enter edit mode'}
          title={editMode ? 'Exit edit mode' : 'Edit: show checkboxes + bulk delete'}
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
        <Button
          type="button"
          size="icon"
          aria-label="New brand"
          title="New brand"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>New brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Name</div>
              <Input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Brand name"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Logo</div>
              <ImageUpload
                value={createLogoUrl}
                onChange={setCreateLogoUrl}
                folder="brands"
                compact
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={createBrand} disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
        <p className="text-sm text-muted-foreground">No brands found.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {rows.map((row) => {
            const dirty = isRowDirty(row)
            const fileUrl = row.draftLogoUrl ?? row.logoUrl
            const saving = savingIds.has(row.id)

            return (
              <li key={row.id} className="flex items-center gap-3 px-3 py-3">
                {/* Image upload — always on the left, icon-only affordance */}
                <ImageUpload
                  value={row.draftLogoUrl}
                  onChange={(value) => updateRow(row.id, { draftLogoUrl: value })}
                  folder="brands"
                  compact
                  iconOnly
                />

                {/* Name input — center, wraps if needed */}
                <div className="min-w-0 flex-1">
                  <Input
                    value={row.draftName}
                    onChange={(event) => updateRow(row.id, { draftName: event.target.value })}
                    className="h-9"
                    aria-label="Brand name"
                  />
                </div>

                {/* Icon actions: view file (eye) — delete only via bulk */}
                {fileUrl && !editMode && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="View file"
                    title="View file"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}

                {dirty && !editMode && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveRow(row)}
                    disabled={saving}
                    className="shrink-0"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                )}

                {/* Checkmark — right — only in edit mode, replaces row controls */}
                {editMode && (
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0"
                    checked={selectedIds.has(row.id)}
                    onChange={(event) => toggleSelected(row.id, event.target.checked)}
                    disabled={busy}
                    aria-label={`Select ${row.name}`}
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
