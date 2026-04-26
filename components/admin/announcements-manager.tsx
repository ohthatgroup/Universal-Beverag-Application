'use client'

import { useMemo, useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RowReorderArrows } from '@/components/admin/row-actions'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnnouncementDialog } from '@/components/admin/announcement-dialog'
import type { PickerProduct } from '@/components/admin/product-picker'
import type { Announcement } from '@/components/portal/announcements-stack'

interface AnnouncementsManagerProps {
  initialAnnouncements: Announcement[]
  pickerProducts: PickerProduct[]
}

// Strip nullable date strings to YYYY-MM-DD so the API's date column accepts
// them. Server-side timestamps come back as ISO strings; the API expects the
// shorter form on update.
function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  return value.length > 10 ? value.slice(0, 10) : value
}

const TYPE_LABELS: Record<Announcement['content_type'], string> = {
  text: 'Text',
  image: 'Image',
  image_text: 'Image+Text',
  product: 'Product',
  specials_grid: 'Specials grid',
}

function isLive(a: Announcement, now: Date): boolean {
  if (!a.is_active) return false
  if (a.starts_at && new Date(a.starts_at) > now) return false
  if (a.ends_at && new Date(a.ends_at) <= now) return false
  return true
}

function formatDateRange(a: Announcement): string {
  const start = a.starts_at ? new Date(a.starts_at) : null
  const end = a.ends_at ? new Date(a.ends_at) : null
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (start && end) return `${fmt(start)}–${fmt(end)}`
  if (start) return `${fmt(start)}–`
  if (end) return `until ${fmt(end)}`
  return '—'
}

function formatAudience(tags: string[]): string {
  if (tags.length === 0) return 'All'
  return tags.join(', ')
}

export function AnnouncementsManager({
  initialAnnouncements,
  pickerProducts,
}: AnnouncementsManagerProps) {
  const [rows, setRows] = useState<Announcement[]>(initialAnnouncements)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null)
  const [error, setError] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])
  const liveRows = rows.filter((a) => isLive(a, now))
  const scheduledRows = rows.filter((a) => !isLive(a, now))

  // Surface fetch errors as a plain message above the table; cleared on the
  // next successful mutation.
  const handleApiError = async (response: Response, fallback: string) => {
    let message = fallback
    try {
      const payload = (await response.json()) as
        | { error?: { message?: string } }
        | null
      message = payload?.error?.message ?? fallback
    } catch {
      /* response wasn't JSON, use fallback */
    }
    setError(message)
  }

  const moveRow = async (id: string, direction: 'up' | 'down') => {
    const index = rows.findIndex((r) => r.id === id)
    if (index < 0) return
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= rows.length) return

    const previous = rows
    const next = [...rows]
    ;[next[index], next[swap]] = [next[swap], next[index]]
    // Recompute sort_order so the visible order matches the persisted one.
    const reordered = next.map((row, i) => ({ ...row, sort_order: i }))
    setRows(reordered)
    setError(null)

    try {
      const response = await fetch('/api/admin/announcements/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: reordered.map((row) => ({
            id: row.id,
            sort_order: row.sort_order,
          })),
        }),
      })
      if (!response.ok) {
        setRows(previous)
        await handleApiError(response, 'Failed to reorder announcements.')
      }
    } catch {
      setRows(previous)
      setError('Failed to reorder announcements.')
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const previous = rows
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: isActive } : r)),
    )
    setError(null)

    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (!response.ok) {
        setRows(previous)
        await handleApiError(response, 'Failed to update announcement.')
      }
    } catch {
      setRows(previous)
      setError('Failed to update announcement.')
    }
  }

  const removeRow = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return
    const previous = rows
    setRows((prev) => prev.filter((r) => r.id !== id))
    setError(null)

    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        setRows(previous)
        await handleApiError(response, 'Failed to delete announcement.')
      }
    } catch {
      setRows(previous)
      setError('Failed to delete announcement.')
    }
  }

  const openCreate = () => {
    setEditingAnnouncement(null)
    setDialogOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditingAnnouncement(a)
    setDialogOpen(true)
  }

  const handleSave = async (data: Partial<Announcement>) => {
    setError(null)
    const editing = editingAnnouncement
    const body = {
      content_type: data.content_type ?? 'text',
      title: data.title ?? null,
      body: data.body ?? null,
      image_url: data.image_url ?? null,
      cta_label: data.cta_label ?? null,
      cta_target_kind: data.cta_target_kind ?? null,
      cta_target_url: data.cta_target_url ?? null,
      cta_target_product_id: data.cta_target_product_id ?? null,
      cta_target_product_ids: data.cta_target_product_ids ?? [],
      product_id: data.product_id ?? null,
      product_ids: data.product_ids ?? [],
      badge_overrides: data.badge_overrides ?? {},
      audience_tags: data.audience_tags ?? [],
      starts_at: dateOnly(data.starts_at),
      ends_at: dateOnly(data.ends_at),
      is_active: data.is_active ?? true,
    }

    try {
      const response = editing
        ? await fetch(`/api/admin/announcements/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/admin/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

      if (!response.ok) {
        await handleApiError(
          response,
          editing
            ? 'Failed to update announcement.'
            : 'Failed to create announcement.',
        )
        return
      }

      const payload = (await response.json()) as {
        data?: { announcement?: Announcement }
      }
      const saved = payload.data?.announcement
      if (!saved) {
        setError('Saved, but the server returned no row. Refresh to see it.')
        return
      }

      setRows((prev) =>
        editing
          ? prev.map((r) => (r.id === editing.id ? saved : r))
          : [...prev, saved].sort((a, b) => a.sort_order - b.sort_order),
      )
    } catch {
      setError(
        editing
          ? 'Failed to update announcement.'
          : 'Failed to create announcement.',
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div /> {/* spacer — page title lives in PageHeader */}
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New announcement
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live ({liveRows.length})</TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled ({scheduledRows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <AnnouncementsTable
            rows={liveRows}
            allRows={rows}
            onMoveRow={moveRow}
            onToggleActive={toggleActive}
            onEdit={openEdit}
            onDelete={removeRow}
          />
        </TabsContent>

        <TabsContent value="scheduled">
          <AnnouncementsTable
            rows={scheduledRows}
            allRows={rows}
            onMoveRow={moveRow}
            onToggleActive={toggleActive}
            onEdit={openEdit}
            onDelete={removeRow}
          />
        </TabsContent>
      </Tabs>

      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialAnnouncement={editingAnnouncement}
        onSave={handleSave}
        pickerProducts={pickerProducts}
      />
    </div>
  )
}

interface AnnouncementsTableProps {
  rows: Announcement[]
  allRows: Announcement[]
  onMoveRow: (id: string, direction: 'up' | 'down') => void
  onToggleActive: (id: string, isActive: boolean) => void
  onEdit: (a: Announcement) => void
  onDelete: (id: string) => void
}

function AnnouncementsTable({
  rows,
  allRows,
  onMoveRow,
  onToggleActive,
  onEdit,
  onDelete,
}: AnnouncementsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No announcements in this group.
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Title</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Audience</th>
            <th className="px-4 py-3 text-left font-medium">Dates</th>
            <th className="px-4 py-3 text-left font-medium">Active</th>
            <th className="w-32 px-4 py-3 text-left font-medium">Order</th>
            <th className="w-12 px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const overallIndex = allRows.findIndex((r) => r.id === row.id)
            return (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">
                  {row.title ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {TYPE_LABELS[row.content_type]}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatAudience(row.audience_tags)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateRange(row)}
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={(checked) =>
                      onToggleActive(row.id, checked)
                    }
                    aria-label={`Toggle ${row.title ?? 'announcement'}`}
                  />
                </td>
                <td className="px-2 py-3">
                  <RowReorderArrows
                    isFirst={overallIndex <= 0}
                    isLast={overallIndex >= allRows.length - 1}
                    onUp={() => onMoveRow(row.id, 'up')}
                    onDown={() => onMoveRow(row.id, 'down')}
                    onTop={() => {
                      // Move to top via repeated up swaps in mock mode
                      let i = overallIndex
                      while (i > 0) {
                        onMoveRow(row.id, 'up')
                        i--
                      }
                    }}
                    onBottom={() => {
                      let i = overallIndex
                      while (i < allRows.length - 1) {
                        onMoveRow(row.id, 'down')
                        i++
                      }
                    }}
                  />
                </td>
                <td className="px-2 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(row)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(row.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
