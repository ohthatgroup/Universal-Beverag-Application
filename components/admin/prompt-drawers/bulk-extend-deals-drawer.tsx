'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { PromptDrawerProps } from './registry'

interface RowState {
  /** Original ends_at (YYYY-MM-DD); used to detect "touched" rows. */
  original: string
  /** Current input value. */
  value: string
}

/**
 * Per-row date-picker drawer. The card prompt's subjects each get
 * their own date input pre-filled with the deal's current ends_at.
 * Only rows whose date was changed to a strictly later date are
 * counted toward the verb button. Untouched rows are skipped.
 */
export function BulkExtendDealsDrawer({
  prompt,
  onClose,
  onCompleted,
}: PromptDrawerProps) {
  const initialRows = useMemo<Record<string, RowState>>(() => {
    const today = new Date().toISOString().slice(0, 10)
    const out: Record<string, RowState> = {}
    for (const subject of prompt.subjects) {
      // The subject sublabel is "expires today/tomorrow/in N days";
      // we don't get the exact date in the subject. Fall back to today;
      // the salesman just changes it. (Slice 4 follow-up: thread the
      // current ends_at through the subject metadata so the prefill
      // is exact.)
      out[subject.id] = { original: today, value: today }
    }
    return out
  }, [prompt.subjects])

  const [rows, setRows] = useState<Record<string, RowState>>(initialRows)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const touchedIds = Object.entries(rows)
    .filter(([, state]) => state.value > state.original)
    .map(([id]) => id)

  const submit = async () => {
    if (touchedIds.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const updates = touchedIds.map((id) => ({
        id,
        newEndsAt: rows[id]!.value,
      }))
      const res = await fetch('/api/admin/announcements/bulk-extend-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) throw new Error('Failed to extend deals')
      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extend deals')
      setSubmitting(false)
    }
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
            Set a new end date per deal. Untouched rows are skipped.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <ul className="divide-y rounded-md border">
            {prompt.subjects.map((subject) => {
              const state = rows[subject.id]!
              const touched = state.value > state.original
              return (
                <li
                  key={subject.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
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
                  <input
                    type="date"
                    value={state.value}
                    onChange={(e) =>
                      setRows((prev) => ({
                        ...prev,
                        [subject.id]: {
                          ...prev[subject.id]!,
                          value: e.target.value,
                        },
                      }))
                    }
                    className={`h-8 rounded-md border px-2 text-xs ${touched ? 'border-foreground' : ''}`}
                  />
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || touchedIds.length === 0}
          >
            {submitting
              ? 'Extending…'
              : touchedIds.length === 0
                ? 'Pick a date'
                : `Extend ${touchedIds.length}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
