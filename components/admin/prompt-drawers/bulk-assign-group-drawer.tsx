'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  CustomerTypePicker,
  type GroupOption,
} from '@/components/admin/customer-type-picker'
import type { PromptDrawerProps } from './registry'

interface ApiResponse {
  data?: {
    groups?: Array<{ id: string; name: string; isDefault?: boolean }>
    defaultGroupId?: string
  }
}

/**
 * Bulk-assign-group drawer. Group picker starts unselected; verb
 * button stays disabled until the salesman picks one. Subjects are
 * pre-checked; deselecting reduces the count. "+ Create new…"
 * sentinel inside the picker auto-selects the new group.
 */
export function BulkAssignGroupDrawer({
  prompt,
  onClose,
  onCompleted,
}: PromptDrawerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(prompt.subjects.map((s) => s.id)),
  )
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [defaultGroupId, setDefaultGroupId] = useState<string>('')
  const [groupId, setGroupId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/customer-groups')
      .then((r) => r.json() as Promise<ApiResponse>)
      .then((payload) => {
        if (cancelled) return
        const list = payload.data?.groups ?? []
        setGroups(
          list.map((g) => ({
            id: g.id,
            name: g.name,
            isDefault: g.isDefault,
          })),
        )
        setDefaultGroupId(payload.data?.defaultGroupId ?? '')
      })
      .catch(() => {
        if (cancelled) return
        setError('Could not load groups.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = async () => {
    if (!groupId || selectedIds.size === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/customers/bulk-assign-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          customerGroupId: groupId,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        throw new Error(body?.error?.message ?? 'Could not assign group.')
      }
      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign group.')
      setSubmitting(false)
    }
  }

  const canSubmit = !!groupId && selectedIds.size > 0 && !submitting

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            {prompt.title}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Pick a group, deselect any customer you want to skip.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Move them to
            </div>
            {groups.length > 0 && (
              <CustomerTypePicker
                groups={groups}
                value={groupId}
                onChange={setGroupId}
                defaultGroupId={defaultGroupId}
                placeholder="Pick a group…"
              />
            )}
          </div>

          <ul className="divide-y rounded-md border">
            {prompt.subjects.map((subject) => {
              const checked = selectedIds.has(subject.id)
              return (
                <li
                  key={subject.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(subject.id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {subject.label}
                    </div>
                    {subject.sublabel && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {subject.sublabel}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting ? 'Assigning…' : `Assign ${selectedIds.size}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
