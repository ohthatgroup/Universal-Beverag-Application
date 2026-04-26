'use client'

import { useMemo, useState } from 'react'
import { Eye, EyeOff, Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface GroupOption {
  id: string
  name: string
}

export interface CustomerOverrideRow {
  announcementId: string
  title: string
  kind: 'announcement' | 'deal'
  contentType: string
  /** Announcement's own sort_order from the table. */
  globalSortOrder: number
  globalIsActive: boolean
  /** Group-scope override values (null = inherit from global). */
  groupSortOrder: number | null
  groupIsHidden: boolean | null
  /** Customer-scope override values (null = inherit from group, then global). */
  customerSortOrder: number | null
  customerIsHidden: boolean | null
}

interface CustomerOverridesPanelProps {
  customerId: string
  customerGroupId: string | null
  rows: CustomerOverrideRow[]
}

/**
 * Per-customer overrides editor for the customer-edit page.
 *
 *   - Resolved view: shows what the customer actually sees today after the
 *     cascade (customer override → group override → global default).
 *   - Hide / show toggle: writes a customer-scope override.
 *   - Sort-order input: writes a customer-scope override.
 *   - "Apply group default" / "Reset to default" button: deletes the
 *     customer-scope override row, letting the customer inherit from the
 *     group (or global if no group).
 *
 * The salesman only edits at the customer level here. Group-level edits
 * happen on the Deals page via "Set for group". This separation avoids
 * a "where did my change land?" foot-gun.
 */
export function CustomerOverridesPanel({
  customerId,
  customerGroupId,
  rows: initialRows,
}: CustomerOverridesPanelProps) {
  const [rows, setRows] = useState<CustomerOverrideRow[]>(initialRows)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Local input state for sort_order edits — flushes on blur to avoid a
  // network call per keystroke.
  const [draftSortOrder, setDraftSortOrder] = useState<Record<string, string>>(
    {},
  )

  const surfaceError = async (response: Response, fallback: string) => {
    try {
      const payload = (await response.json()) as
        | { error?: { message?: string } }
        | null
      setError(payload?.error?.message ?? fallback)
    } catch {
      setError(fallback)
    }
  }

  const setOverride = async (
    announcementId: string,
    body: { is_hidden?: boolean | null; sort_order?: number | null },
  ) => {
    setBusyId(announcementId)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/announcements/${announcementId}/overrides`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'customer',
            scope_id: customerId,
            ...body,
          }),
        },
      )
      if (!response.ok) {
        await surfaceError(response, 'Failed to save override.')
        return false
      }
      return true
    } catch {
      setError('Failed to save override.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  const clearOverride = async (announcementId: string) => {
    setBusyId(announcementId)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/announcements/${announcementId}/overrides`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'customer',
            scope_id: customerId,
          }),
        },
      )
      if (!response.ok && response.status !== 404) {
        // 404 = no override existed, which is fine here
        await surfaceError(response, 'Failed to reset override.')
        return false
      }
      return true
    } catch {
      setError('Failed to reset override.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  const onToggleHidden = async (
    row: CustomerOverrideRow,
    currentlyHidden: boolean,
  ) => {
    const previous = rows
    const nextHidden = !currentlyHidden
    setRows((prev) =>
      prev.map((r) =>
        r.announcementId === row.announcementId
          ? { ...r, customerIsHidden: nextHidden }
          : r,
      ),
    )
    const ok = await setOverride(row.announcementId, { is_hidden: nextHidden })
    if (!ok) setRows(previous)
  }

  const onCommitSortOrder = async (row: CustomerOverrideRow) => {
    const draft = draftSortOrder[row.announcementId]
    if (draft === undefined) return
    const trimmed = draft.trim()
    const previous = rows

    if (trimmed === '') {
      // Empty input = clear the customer's sort_order override (inherit).
      setRows((prev) =>
        prev.map((r) =>
          r.announcementId === row.announcementId
            ? { ...r, customerSortOrder: null }
            : r,
        ),
      )
      const ok = await setOverride(row.announcementId, { sort_order: null })
      if (!ok) setRows(previous)
      setDraftSortOrder((prev) => {
        const next = { ...prev }
        delete next[row.announcementId]
        return next
      })
      return
    }

    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      setError('Sort order must be a whole number.')
      return
    }

    setRows((prev) =>
      prev.map((r) =>
        r.announcementId === row.announcementId
          ? { ...r, customerSortOrder: parsed }
          : r,
      ),
    )
    const ok = await setOverride(row.announcementId, { sort_order: parsed })
    if (!ok) setRows(previous)
    setDraftSortOrder((prev) => {
      const next = { ...prev }
      delete next[row.announcementId]
      return next
    })
  }

  const onApplyDefault = async (row: CustomerOverrideRow) => {
    const previous = rows
    setRows((prev) =>
      prev.map((r) =>
        r.announcementId === row.announcementId
          ? { ...r, customerSortOrder: null, customerIsHidden: null }
          : r,
      ),
    )
    const ok = await clearOverride(row.announcementId)
    if (!ok) setRows(previous)
  }

  // Resolved values per row (what the customer actually sees today).
  const resolvedRows = useMemo(() => {
    return rows.map((r) => {
      const effectiveHidden =
        r.customerIsHidden ?? r.groupIsHidden ?? false
      const effectiveSort =
        r.customerSortOrder ?? r.groupSortOrder ?? r.globalSortOrder
      const hasCustomerOverride =
        r.customerSortOrder !== null || r.customerIsHidden !== null
      const inheritsFromGroup =
        !hasCustomerOverride &&
        (r.groupSortOrder !== null || r.groupIsHidden !== null)
      return {
        row: r,
        effectiveHidden,
        effectiveSort,
        hasCustomerOverride,
        inheritsFromGroup,
      }
    })
  }, [rows])

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold">
          Deals & announcements visibility
        </h2>
        <p className="text-xs text-muted-foreground">
          {customerGroupId
            ? 'This customer inherits ordering + visibility from their group. Override per-deal here when needed; tap reset to fall back to the group default.'
            : 'No group assigned, so overrides applied here cascade directly off the global defaults.'}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No deals or announcements yet. Create one on the Deals &
          Announcements page.
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {resolvedRows.map(
            ({
              row,
              effectiveHidden,
              effectiveSort,
              hasCustomerOverride,
              inheritsFromGroup,
            }) => {
              const sourceLabel = hasCustomerOverride
                ? 'this customer'
                : inheritsFromGroup
                  ? 'group'
                  : 'global'
              const isBusy = busyId === row.announcementId
              const sortOrderInputValue =
                draftSortOrder[row.announcementId] ??
                (row.customerSortOrder !== null
                  ? String(row.customerSortOrder)
                  : '')
              return (
                <li
                  key={row.announcementId}
                  className={cn(
                    'flex items-start justify-between gap-3 px-3 py-2.5',
                    isBusy && 'opacity-60',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {row.title}
                      </span>
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
                          hasCustomerOverride
                            ? 'font-semibold text-accent'
                            : inheritsFromGroup
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
                      onChange={(e) =>
                        setDraftSortOrder((prev) => ({
                          ...prev,
                          [row.announcementId]: e.target.value,
                        }))
                      }
                      onBlur={() => onCommitSortOrder(row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          ;(e.target as HTMLInputElement).blur()
                        }
                      }}
                      placeholder="–"
                      title="Customer-only sort order. Empty = inherit."
                      className="h-8 w-14 px-1.5 text-center text-xs"
                      disabled={isBusy}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onToggleHidden(row, effectiveHidden)}
                      disabled={isBusy}
                      title={effectiveHidden ? 'Show for this customer' : 'Hide for this customer'}
                      aria-label={
                        effectiveHidden
                          ? `Show ${row.title} for this customer`
                          : `Hide ${row.title} for this customer`
                      }
                    >
                      {effectiveHidden ? (
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
                        hasCustomerOverride
                          ? 'text-accent hover:text-accent'
                          : 'text-muted-foreground/40',
                      )}
                      onClick={() => onApplyDefault(row)}
                      disabled={isBusy || !hasCustomerOverride}
                      title={
                        hasCustomerOverride
                          ? 'Reset — apply group default'
                          : 'Already on default'
                      }
                      aria-label="Apply group default"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            },
          )}
        </ul>
      )}
    </section>
  )
}
