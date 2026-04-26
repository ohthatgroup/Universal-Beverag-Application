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

  const now = useMemo(() => new Date(), [])
  const liveRows = rows.filter((a) => isLive(a, now))
  const scheduledRows = rows.filter((a) => !isLive(a, now))

  const moveRow = (id: string, direction: 'up' | 'down') => {
    setRows((prev) => {
      const index = prev.findIndex((r) => r.id === id)
      if (index < 0) return prev
      const swap = direction === 'up' ? index - 1 : index + 1
      if (swap < 0 || swap >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[swap]] = [next[swap], next[index]]
      // TODO: wire up PATCH to /api/admin/announcements/[id] with new sort_order
      return next
    })
  }

  const toggleActive = (id: string, isActive: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: isActive } : r)),
    )
    // TODO: wire up PATCH to /api/admin/announcements/[id] with is_active
  }

  const removeRow = (id: string) => {
    if (!window.confirm('Delete this announcement?')) return
    setRows((prev) => prev.filter((r) => r.id !== id))
    // TODO: wire up DELETE /api/admin/announcements/[id]
  }

  const openCreate = () => {
    setEditingAnnouncement(null)
    setDialogOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditingAnnouncement(a)
    setDialogOpen(true)
  }

  const handleSave = (data: Partial<Announcement>) => {
    setRows((prev) => {
      if (editingAnnouncement) {
        return prev.map((r) =>
          r.id === editingAnnouncement.id ? { ...r, ...data } : r,
        )
      }
      const nextId = `local-${Date.now()}`
      const created: Announcement = {
        id: nextId,
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
        starts_at: data.starts_at ?? null,
        ends_at: data.ends_at ?? null,
        is_active: data.is_active ?? true,
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return [...prev, created]
    })
    // TODO: wire up POST/PATCH /api/admin/announcements
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
