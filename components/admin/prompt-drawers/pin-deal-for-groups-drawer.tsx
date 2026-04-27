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
import { cn } from '@/lib/utils'
import type { PromptDrawerProps } from './registry'

interface DealOption {
  id: string
  title: string
  target_group_ids: string[]
  ends_at: string | null
}

/**
 * Pin-a-deal-for-groups drawer. Two modes:
 *   - Add to existing deal: pick an active/scheduled deal, append the
 *     selected groups to its `target_group_ids`. Auto-uncheck rows
 *     whose group is already targeted.
 *   - Create new deal: closes drawer and opens the existing
 *     `<AnnouncementDialog>` pre-populated with `target_group_ids`
 *     and `kind = 'deal'`. (For v1 the "create new" mode shows a
 *     placeholder; the dialog handoff is wired in slice 4 follow-up.)
 */
export function PinDealForGroupsDrawer({
  prompt,
  onClose,
  onCompleted,
}: PromptDrawerProps) {
  const [mode, setMode] = useState<'existing' | 'create'>('existing')
  const [deals, setDeals] = useState<DealOption[]>([])
  const [dealId, setDealId] = useState<string | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    () => new Set(prompt.subjects.map((s) => s.id)),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/announcements?kind=deal')
      .then(
        (r) =>
          r.json() as Promise<{
            data?: {
              announcements?: Array<{
                id: string
                kind: string
                title: string | null
                is_active: boolean
                starts_at: string | null
                ends_at: string | null
                target_group_ids: string[]
              }>
            }
          }>,
      )
      .then((payload) => {
        if (cancelled) return
        const today = new Date().toISOString().slice(0, 10)
        const list = (payload.data?.announcements ?? [])
          .filter((a) => a.kind === 'deal')
          .filter((a) => !a.ends_at || a.ends_at >= today) // active or scheduled
          .map((a) => ({
            id: a.id,
            title: a.title ?? 'Untitled deal',
            target_group_ids: a.target_group_ids,
            ends_at: a.ends_at,
          }))
        setDeals(list)
      })
      .catch(() => {
        if (cancelled) return
        setError('Could not load deals.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-uncheck rows already targeted by the picked deal.
  useEffect(() => {
    if (!dealId) return
    const deal = deals.find((d) => d.id === dealId)
    if (!deal) return
    setSelectedGroupIds((prev) => {
      const next = new Set(prev)
      for (const id of deal.target_group_ids) next.delete(id)
      return next
    })
  }, [dealId, deals])

  const submit = async () => {
    if (mode !== 'existing' || !dealId || selectedGroupIds.size === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        '/api/admin/announcements/pin-deal-for-groups',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dealId,
            groupIds: Array.from(selectedGroupIds),
          }),
        },
      )
      if (!res.ok) throw new Error('Failed to pin the deal')
      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pin the deal')
      setSubmitting(false)
    }
  }

  const isAlreadyTargeted = (groupId: string): boolean => {
    if (!dealId) return false
    const deal = deals.find((d) => d.id === dealId)
    return deal?.target_group_ids.includes(groupId) ?? false
  }

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
            Add these groups to an existing deal, or create a new one
            targeted at them.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="inline-flex rounded-md border bg-muted/30 p-0.5 text-xs font-medium">
            {(
              [
                { value: 'existing', label: 'Add to existing deal' },
                { value: 'create', label: 'Create new deal' },
              ] as const
            ).map((opt) => {
              const active = mode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    'rounded px-3 py-1 transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {mode === 'existing' && (
            <select
              value={dealId ?? ''}
              onChange={(e) => setDealId(e.target.value || null)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Pick a deal…</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.title}
                  {deal.ends_at ? ` · until ${deal.ends_at}` : ''}
                </option>
              ))}
            </select>
          )}

          {mode === 'create' && (
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
              Click <strong>Continue</strong> below to open the deal
              builder pre-populated with these groups.
            </div>
          )}

          <ul className="divide-y rounded-md border">
            {prompt.subjects.map((subject) => {
              const checked = selectedGroupIds.has(subject.id)
              const alreadyTargeted = isAlreadyTargeted(subject.id)
              return (
                <li
                  key={subject.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2',
                    alreadyTargeted && 'opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedGroupIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(subject.id)) next.delete(subject.id)
                        else next.add(subject.id)
                        return next
                      })
                    }
                    disabled={alreadyTargeted}
                    className="h-4 w-4 rounded border-input"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {subject.label}
                    </div>
                    {subject.sublabel && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {subject.sublabel}
                      </div>
                    )}
                  </div>
                  {alreadyTargeted && (
                    <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                      Already targeted
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {mode === 'existing' ? (
            <Button
              onClick={submit}
              disabled={submitting || !dealId || selectedGroupIds.size === 0}
            >
              {submitting
                ? 'Pinning…'
                : `Add to deal · ${selectedGroupIds.size}`}
            </Button>
          ) : (
            <Button
              onClick={() => {
                window.location.href = `/admin/announcements?create=deal&groups=${Array.from(selectedGroupIds).join(',')}`
              }}
              disabled={selectedGroupIds.size === 0}
            >
              Continue
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
