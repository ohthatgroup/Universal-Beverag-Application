'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { AdminFab } from '@/components/admin/admin-fab'
import { BulkActionBar } from '@/components/admin/bulk-action-bar'
import { ListToolbar } from '@/components/admin/list-toolbar'
import { NewPresetDialog } from '@/components/admin/new-preset-dialog'
import { RowCheckbox } from '@/components/admin/row-actions'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import { EmptyState } from '@/components/ui/empty-state'
import { presetsClient } from '@/lib/admin/presets-client'

export interface PresetListRow {
  id: string
  name: string
  brandCount: number
  sizeCount: number
  productCount: number
}

interface PresetsListProps {
  presets: PresetListRow[]
  searchQuery: string
  search?: ReactNode
}

export function PresetsList({ presets, searchQuery, search }: PresetsListProps) {
  const router = useRouter()
  const [rows, setRows] = useState<PresetListRow[]>(presets)
  const [editMode, setEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setRows(presets)
    setSelectedIds(new Set())
  }, [presets])

  const selectedCount = selectedIds.size
  const searchIsActive = searchQuery.trim().length > 0
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds]
  )

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleCreate = async ({
    name,
    description,
  }: {
    name: string
    description: string | null
  }) => {
    const created = await presetsClient.create({ name, description })
    setRows((prev) => [
      {
        id: created.id,
        name: created.name,
        brandCount: created.brandCount,
        sizeCount: created.sizeCount,
        productCount: created.productCount,
      },
      ...prev,
    ])
    router.refresh()
  }

  const deleteSelected = async () => {
    if (busy || selectedRows.length === 0) return
    setBusy(true)
    const ids = new Set(selectedRows.map((row) => row.id))
    try {
      await Promise.all(selectedRows.map((row) => presetsClient.remove(row.id)))
      setRows((prev) => prev.filter((row) => !ids.has(row.id)))
      setSelectedIds(new Set())
      router.refresh()
    } finally {
      setBusy(false)
    }
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
        editTitle={editMode ? 'Exit edit mode' : 'Edit: show checkboxes + bulk delete'}
        onAdd={() => setCreateOpen(true)}
        addLabel="New preset"
      />

      <AdminFab
        icon={<Plus className="h-6 w-6" />}
        label="New preset"
        onClick={() => setCreateOpen(true)}
      />

      <NewPresetDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />

      {editMode && (
        <BulkActionBar
          selectedCount={selectedCount}
          onDelete={() => setConfirmDeleteOpen(true)}
          onClear={() => setSelectedIds(new Set())}
          busy={busy}
        />
      )}

      <ConfirmSheet
        open={confirmDeleteOpen}
        onOpenChange={(next) => {
          if (!busy) setConfirmDeleteOpen(next)
        }}
        title={`Delete ${selectedCount} preset${selectedCount === 1 ? '' : 's'}?`}
        description="This can't be undone. Customers who had this preset applied keep their current visibility rules."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={busy}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          void deleteSelected()
        }}
      />

      {rows.length === 0 ? (
        <EmptyState
          title={searchIsActive ? 'No presets match your search' : 'No presets yet'}
          description={
            searchIsActive
              ? 'Try a different search term.'
              : 'Create a preset to curate a catalog view you can reuse across customers.'
          }
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-3 py-3">
              {editMode && (
                <RowCheckbox
                  label={`Select ${row.name}`}
                  checked={selectedIds.has(row.id)}
                  onChange={(event) => toggleSelected(row.id, event.target.checked)}
                  disabled={busy}
                />
              )}
              <Link
                href={`/admin/presets/${row.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
                onClick={(event) => {
                  if (editMode) {
                    event.preventDefault()
                    toggleSelected(row.id, !selectedIds.has(row.id))
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{row.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {summarize(row)}
                  </div>
                </div>
                {!editMode && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function summarize(row: PresetListRow): string {
  const parts: string[] = []
  if (row.brandCount > 0) parts.push(`${row.brandCount} brand${row.brandCount === 1 ? '' : 's'}`)
  if (row.sizeCount > 0) parts.push(`${row.sizeCount} size${row.sizeCount === 1 ? '' : 's'}`)
  if (row.productCount > 0)
    parts.push(`${row.productCount} product${row.productCount === 1 ? '' : 's'}`)
  if (parts.length === 0) return 'No rules yet'
  return parts.join(' · ')
}
