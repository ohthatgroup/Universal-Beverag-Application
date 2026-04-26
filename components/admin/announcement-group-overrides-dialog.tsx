'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Panel } from '@/components/ui/panel'
import { cn } from '@/lib/utils'

interface GroupOverrideState {
  groupId: string
  groupName: string
  /** null = no override row exists for this (announcement, group) pair */
  isHidden: boolean | null
  /** null = no override for sort_order; group inherits from global */
  sortOrder: number | null
}

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcementId: string | null
  announcementTitle: string | null
}

interface ApiOverrideRow {
  scope: string
  scope_id: string
  is_hidden: boolean | null
  sort_order: number | null
}

/**
 * Per-announcement group-overrides dialog. The salesman opens this from a
 * row's dropdown on /admin/announcements. Lists every customer group; per
 * group they can:
 *   - Hide / show this announcement (writes group-scope is_hidden)
 *   - Pin to a custom sort_order (writes group-scope sort_order)
 *   - Reset to inherit from the global default
 *
 * Per-customer overrides are NOT shown here — those live on the
 * customer-edit page so a single salesman flow doesn't conflate the two
 * scopes.
 */
export function AnnouncementGroupOverridesDialog({
  open,
  onOpenChange,
  announcementId,
  announcementTitle,
}: DialogProps) {
  const [groups, setGroups] = useState<GroupOverrideState[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draftSortOrder, setDraftSortOrder] = useState<Record<string, string>>(
    {},
  )

  useEffect(() => {
    if (!open || !announcementId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setDraftSortOrder({})
    const load = async () => {
      try {
        // Fetch groups + this announcement's group-scope overrides in
        // parallel; merge them into a single per-group state list.
        const [groupsRes, overridesRes] = await Promise.all([
          fetch('/api/admin/customer-groups'),
          fetch(`/api/admin/announcements/${announcementId}/overrides`),
        ])
        if (!groupsRes.ok) throw new Error('Failed to load groups')
        const groupsBody = (await groupsRes.json()) as {
          data?: { groups?: Array<{ id: string; name: string }> }
        }
        const groupList = groupsBody.data?.groups ?? []
        let overrideRows: ApiOverrideRow[] = []
        if (overridesRes.ok) {
          const overridesBody = (await overridesRes.json()) as {
            data?: { overrides?: ApiOverrideRow[] }
          }
          overrideRows = overridesBody.data?.overrides ?? []
        }
        // 404 here is fine — endpoint may simply not exist yet for an
        // announcement with no rows.
        const overrideByScopeId = new Map(
          overrideRows
            .filter((o) => o.scope === 'group')
            .map((o) => [o.scope_id, o] as const),
        )
        const merged: GroupOverrideState[] = groupList.map((g) => {
          const ov = overrideByScopeId.get(g.id)
          return {
            groupId: g.id,
            groupName: g.name,
            isHidden: ov?.is_hidden ?? null,
            sortOrder: ov?.sort_order ?? null,
          }
        })
        if (!cancelled) setGroups(merged)
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load groups.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, announcementId])

  const setGroupOverride = async (
    groupId: string,
    body: { is_hidden?: boolean | null; sort_order?: number | null },
  ) => {
    if (!announcementId) return false
    setBusyGroupId(groupId)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/announcements/${announcementId}/overrides`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'group',
            scope_id: groupId,
            ...body,
          }),
        },
      )
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? 'Failed to save override.')
        return false
      }
      return true
    } catch {
      setError('Failed to save override.')
      return false
    } finally {
      setBusyGroupId(null)
    }
  }

  const clearGroupOverride = async (groupId: string) => {
    if (!announcementId) return false
    setBusyGroupId(groupId)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/announcements/${announcementId}/overrides`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'group', scope_id: groupId }),
        },
      )
      if (!response.ok && response.status !== 404) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? 'Failed to reset override.')
        return false
      }
      return true
    } catch {
      setError('Failed to reset override.')
      return false
    } finally {
      setBusyGroupId(null)
    }
  }

  const onToggleHidden = async (group: GroupOverrideState) => {
    const next = !(group.isHidden ?? false)
    setGroups((prev) =>
      prev?.map((g) =>
        g.groupId === group.groupId ? { ...g, isHidden: next } : g,
      ) ?? null,
    )
    await setGroupOverride(group.groupId, { is_hidden: next })
  }

  const onCommitSortOrder = async (group: GroupOverrideState) => {
    const draft = draftSortOrder[group.groupId]
    if (draft === undefined) return
    const trimmed = draft.trim()

    if (trimmed === '') {
      setGroups((prev) =>
        prev?.map((g) =>
          g.groupId === group.groupId ? { ...g, sortOrder: null } : g,
        ) ?? null,
      )
      await setGroupOverride(group.groupId, { sort_order: null })
      setDraftSortOrder((prev) => {
        const next = { ...prev }
        delete next[group.groupId]
        return next
      })
      return
    }

    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      setError('Sort order must be a whole number.')
      return
    }
    setGroups((prev) =>
      prev?.map((g) =>
        g.groupId === group.groupId ? { ...g, sortOrder: parsed } : g,
      ) ?? null,
    )
    await setGroupOverride(group.groupId, { sort_order: parsed })
    setDraftSortOrder((prev) => {
      const next = { ...prev }
      delete next[group.groupId]
      return next
    })
  }

  const onReset = async (group: GroupOverrideState) => {
    setGroups((prev) =>
      prev?.map((g) =>
        g.groupId === group.groupId
          ? { ...g, isHidden: null, sortOrder: null }
          : g,
      ) ?? null,
    )
    await clearGroupOverride(group.groupId)
  }

  return (
    <Panel
      open={open}
      onOpenChange={onOpenChange}
      variant="centered"
      contentClassName="w-[calc(100vw-1.5rem)] max-w-lg max-h-[85dvh]"
      srTitle="Group overrides"
    >
      <Panel.Header>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold">Group overrides</h2>
          {announcementTitle && (
            <p className="truncate text-xs text-muted-foreground">
              {announcementTitle}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </Panel.Header>

      <Panel.Body className="space-y-3 px-4 py-4">
        <p className="text-xs text-muted-foreground">
          Pin a custom sort order or hide this {' '}entry for an entire group.
          Customers in the group inherit the override unless they have their
          own per-customer override on their edit page.
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {loading || groups === null ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading groups…
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No customer groups yet. Create one on the Customer Groups page
            first.
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {groups.map((group) => {
              const hasOverride =
                group.isHidden !== null || group.sortOrder !== null
              const isBusy = busyGroupId === group.groupId
              const sortOrderInputValue =
                draftSortOrder[group.groupId] ??
                (group.sortOrder !== null ? String(group.sortOrder) : '')
              const hidden = group.isHidden ?? false
              return (
                <li
                  key={group.groupId}
                  className={cn(
                    'flex items-start justify-between gap-3 px-3 py-2.5',
                    isBusy && 'opacity-60',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{group.groupName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {hasOverride ? (
                        <span className="font-medium text-accent">
                          Group override active
                        </span>
                      ) : (
                        <span>Inherits global default</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-1.5">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={sortOrderInputValue}
                      onChange={(e) =>
                        setDraftSortOrder((prev) => ({
                          ...prev,
                          [group.groupId]: e.target.value,
                        }))
                      }
                      onBlur={() => onCommitSortOrder(group)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          ;(e.target as HTMLInputElement).blur()
                        }
                      }}
                      placeholder="–"
                      title="Group sort_order. Empty = inherit."
                      className="h-8 w-14 px-1.5 text-center text-xs"
                      disabled={isBusy}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onToggleHidden(group)}
                      disabled={isBusy}
                      title={hidden ? 'Show for this group' : 'Hide from this group'}
                      aria-label={
                        hidden
                          ? `Show for ${group.groupName}`
                          : `Hide from ${group.groupName}`
                      }
                    >
                      {hidden ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-8 w-8',
                        hasOverride
                          ? 'text-accent hover:text-accent'
                          : 'text-muted-foreground/40',
                      )}
                      onClick={() => onReset(group)}
                      disabled={isBusy || !hasOverride}
                      title={
                        hasOverride ? 'Reset to global default' : 'No override set'
                      }
                      aria-label="Reset"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel.Body>

      <Panel.Footer className="flex justify-end">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </Panel.Footer>
    </Panel>
  )
}
