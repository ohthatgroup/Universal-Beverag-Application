'use client'

import { useMemo } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface GroupOverrideRow {
  announcementId: string
  title: string
  kind: 'announcement' | 'deal'
  contentType: string
  /** Announcement's own sort_order from the table (the global default). */
  globalSortOrder: number
  globalIsActive: boolean
  /** Existing group-scope override values (null = inherit from global). */
  groupSortOrder: number | null
  groupIsHidden: boolean | null
}

/**
 * Per-row in-progress edit. NULL on a column = "no change to this row's
 * column"; non-NULL = "set this column to this value when the parent
 * flushes." Empty/unset rows aren't in the dirty map at all.
 */
export interface DirtyOverride {
  is_hidden?: boolean | null
  sort_order?: number | null
}

export type DirtyMap = Record<string, DirtyOverride>

interface GroupOverridesPanelProps {
  rows: GroupOverrideRow[]
  /** In-progress edits, controlled by the parent. */
  dirty: DirtyMap
  onChange: (next: DirtyMap) => void
  /** When the parent is flushing the dirty map; disables the row UI. */
  busy?: boolean
}

/**
 * Read-edit-flush group-overrides editor. Used inside
 * `<EditGroupSettingsModal>` (the customer-detail "Edit group settings"
 * modal) and conceptually also fits the existing per-deal group-overrides
 * dialog.
 *
 * The panel is **controlled** — it doesn't fire to the network. Parent
 * collects the in-progress edits via the `dirty` map and flushes on
 * Save with the propagation warning attached.
 *
 * Per-row resolved view: shows what the GROUP currently sees today
 * (group override → global default, no customer-scope layer post-
 * 202604260007). Source label reads "from this group" or "from global".
 *
 * Drop-on-blur for the sort-order input applies the value to the dirty
 * map; blur with the same value as the existing override is a no-op.
 */
export function GroupOverridesPanel({
  rows,
  dirty,
  onChange,
  busy = false,
}: GroupOverridesPanelProps) {
  const setDirty = (announcementId: string, patch: DirtyOverride | null) => {
    const next = { ...dirty }
    if (patch === null) {
      delete next[announcementId]
    } else {
      next[announcementId] = { ...next[announcementId], ...patch }
    }
    onChange(next)
  }

  // Resolved view per row: applies the dirty edit on top of the
  // existing group/global cascade.
  const resolvedRows = useMemo(() => {
    return rows.map((r) => {
      const d = dirty[r.announcementId] ?? {}
      const effectiveHidden =
        // Dirty wins; then group; then global default.
        ('is_hidden' in d ? (d.is_hidden ?? false) : (r.groupIsHidden ?? false))
      const effectiveSort =
        'sort_order' in d
          ? (d.sort_order ?? r.globalSortOrder)
          : (r.groupSortOrder ?? r.globalSortOrder)
      const hasGroupOverride =
        r.groupSortOrder !== null || r.groupIsHidden !== null
      const hasDirty = r.announcementId in dirty
      return {
        row: r,
        effectiveHidden,
        effectiveSort,
        hasGroupOverride,
        hasDirty,
      }
    })
  }, [rows, dirty])

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No deals or announcements yet.
      </div>
    )
  }

  return (
    <ul className="divide-y rounded-md border">
      {resolvedRows.map(
        ({ row, effectiveHidden, effectiveSort, hasGroupOverride, hasDirty }) => {
          const sourceLabel = hasDirty
            ? 'pending'
            : hasGroupOverride
              ? 'this group'
              : 'global'
          const dirtySort = dirty[row.announcementId]?.sort_order
          const sortOrderInputValue =
            dirtySort !== undefined && dirtySort !== null
              ? String(dirtySort)
              : row.groupSortOrder !== null
                ? String(row.groupSortOrder)
                : ''
          return (
            <li
              key={row.announcementId}
              className={cn(
                'flex items-start justify-between gap-3 px-3 py-2.5',
                busy && 'opacity-60',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{row.title}</span>
                  {row.kind === 'deal' && (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent"
                      title="Deal — locked-quantity bundle"
                    >
                      <Lock className="h-2.5 w-2.5" />
                      Deal
                    </span>
                  )}
                  {effectiveHidden && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-destructive">
                      Hidden
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Order {effectiveSort} ·{' '}
                  <span
                    className={cn(
                      hasDirty
                        ? 'font-semibold text-accent'
                        : hasGroupOverride
                          ? 'text-foreground/70'
                          : '',
                    )}
                  >
                    from {sourceLabel}
                  </span>
                </div>
              </div>
              <div className="flex flex-none items-center gap-1.5">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={sortOrderInputValue}
                  onChange={(e) => {
                    // Stash raw text so users can type freely; commit on blur.
                    const value = e.target.value
                    setDirty(row.announcementId, {
                      ...dirty[row.announcementId],
                      sort_order: value === '' ? null : Number(value),
                    })
                  }}
                  placeholder="–"
                  title="Group sort_order for this row. Empty = inherit global."
                  className="h-8 w-14 px-1.5 text-center text-xs"
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setDirty(row.announcementId, {
                      ...dirty[row.announcementId],
                      is_hidden: !effectiveHidden,
                    })
                  }}
                  disabled={busy}
                  title={
                    effectiveHidden
                      ? 'Show for this group'
                      : 'Hide for this group'
                  }
                  aria-label={
                    effectiveHidden
                      ? `Show ${row.title} for this group`
                      : `Hide ${row.title} for this group`
                  }
                >
                  {effectiveHidden ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </li>
          )
        },
      )}
    </ul>
  )
}
