'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  Eye,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { Panel } from '@/components/ui/panel'
import { addDays, formatDeliveryDate, todayISODate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export interface RecentOrderForDrawer {
  id: string
  deliveryDate: string
  itemCount: number
  total: number
  status: 'submitted' | 'delivered'
}

interface StartOrderDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  /** Customer's next-available delivery date. */
  nextDeliveryDate: string
  /** Day after `nextDeliveryDate` — used when a draft already occupies the next date. */
  nextNextDeliveryDate: string
  /** In-flight draft on or after `nextDeliveryDate`. Drives conflict-replace flow. */
  primaryDraft: {
    id: string
    deliveryDate: string
    itemCount: number
  } | null
  /** Top 5 most-recent submitted/delivered orders. */
  recentOrders: RecentOrderForDrawer[]
  /** Number of items pinned as usuals (drives the "Add N items" button label). */
  usualsCount: number
}

type PathKind = 'reorder' | 'usuals' | 'scratch'

interface PendingPath {
  kind: PathKind
  targetDate: string
  reorderSourceId?: string
}

/**
 * Universal "Start order" entry point. A bottom-sheet panel that holds:
 *
 *   - Delivery date picker
 *   - Top 5 recent orders (each tap = clone into draft)
 *   - "Add my usuals" (one-tap loaded draft) + "Manage usuals" link
 *   - "Start with empty draft" fallback
 *
 * Available from any portal page via the navbar's Start order button.
 */
export function StartOrderDrawer({
  open,
  onOpenChange,
  token,
  nextDeliveryDate,
  nextNextDeliveryDate,
  primaryDraft,
  recentOrders,
  usualsCount,
}: StartOrderDrawerProps) {
  const draftBlocksNext =
    primaryDraft !== null && primaryDraft.deliveryDate === nextDeliveryDate
  const initialDate = draftBlocksNext ? nextNextDeliveryDate : nextDeliveryDate

  const [pickedDate, setPickedDate] = useState(initialDate)
  const [pendingPath, setPendingPath] = useState<PendingPath | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Reset when drawer reopens (so the date is fresh per session)
  useEffect(() => {
    if (open) {
      setPickedDate(
        primaryDraft !== null && primaryDraft.deliveryDate === nextDeliveryDate
          ? nextNextDeliveryDate
          : nextDeliveryDate,
      )
      setPendingPath(null)
    }
  }, [open, primaryDraft, nextDeliveryDate, nextNextDeliveryDate])

  const draftAtPickedDate =
    primaryDraft !== null && primaryDraft.deliveryDate === pickedDate

  const minDate =
    primaryDraft !== null && primaryDraft.deliveryDate >= todayISODate()
      ? addDays(primaryDraft.deliveryDate, 1)
      : todayISODate()

  const onChangeDate: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value
    if (value && value >= todayISODate()) setPickedDate(value)
  }

  const handlePath = (kind: PathKind, reorderSourceId?: string) => {
    if (draftAtPickedDate) {
      setPendingPath({ kind, targetDate: pickedDate, reorderSourceId })
      return
    }
    runPath(kind, pickedDate, reorderSourceId)
  }

  const runPath = (
    kind: PathKind,
    targetDate: string,
    reorderSourceId?: string,
  ) => {
    // TODO: wire up real path actions — see docs/handoff/homepage-redesign.md.
    const friendlyDate = formatDeliveryDate(targetDate)
    if (kind === 'reorder') {
      const source = recentOrders.find((o) => o.id === reorderSourceId)
      if (source) {
        window.alert(
          `Reorder ${formatDeliveryDate(source.deliveryDate)} (${source.itemCount} items) — would clone into a draft for ${friendlyDate}.`,
        )
      }
    } else if (kind === 'usuals') {
      window.alert(
        `Add ${usualsCount} usuals — would create a draft for ${friendlyDate} pre-filled with the customer's usuals.`,
      )
    } else {
      window.alert(
        `Start empty — would create a draft for ${friendlyDate} and drop into the order builder.`,
      )
    }
    onOpenChange(false)
  }

  return (
    <Panel
      open={open}
      onOpenChange={onOpenChange}
      variant="bottom-sheet"
      width="content"
      srTitle="Start an order"
    >
      <Panel.Header>
        <h2 className="flex-1 text-base font-semibold">Start an order</h2>
      </Panel.Header>

      <Panel.Body className="space-y-6 px-5 py-5">
        {/* 1. Delivery date */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Delivery date
          </h3>
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.()}
            className="relative inline-flex h-11 w-full items-center justify-between rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted/40 sm:w-auto"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
              {formatDeliveryDate(pickedDate)}
            </span>
            <span aria-hidden className="ml-3 text-muted-foreground">
              ▾
            </span>
            <input
              ref={dateInputRef}
              type="date"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={pickedDate}
              min={minDate}
              onChange={onChangeDate}
              aria-label="Pick a delivery date"
            />
          </button>
        </div>

        {/* 2. Recent orders — clone */}
        {recentOrders.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Add items from a recent order
            </h3>
            <ul className="space-y-1.5">
              {recentOrders.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => handlePath('reorder', order.id)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left',
                      'transition-colors hover:bg-muted/40',
                    )}
                  >
                    <OrderStatusDot status={order.status} className="shrink-0" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-sm font-semibold">
                        {formatDeliveryDate(order.deliveryDate)}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {order.itemCount}{' '}
                        {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
                        <Money value={order.total} className="font-normal" />
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Usuals */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add your usuals
          </h3>
          <Button
            variant="accent"
            size="lg"
            onClick={() => handlePath('usuals')}
            disabled={usualsCount === 0}
            className="h-12 w-full justify-between gap-3 rounded-xl px-4 sm:w-auto sm:justify-start"
          >
            <span className="flex items-center gap-3 text-base font-semibold">
              <Sparkles className="h-4 w-4" />
              {usualsCount > 0
                ? `Add ${usualsCount} ${usualsCount === 1 ? 'item' : 'items'} as usuals`
                : "You haven't picked any usuals yet"}
            </span>
            <ArrowRight className="h-4 w-4 sm:ml-2" />
          </Button>
          <Link
            href={`/portal/${token}/catalog`}
            onClick={() => onOpenChange(false)}
            className="inline-block text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Manage usuals →
          </Link>
        </div>

        {/* 4. Scratch fallback */}
        <div className="border-t border-foreground/10 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handlePath('scratch')}
            className="h-12 w-full justify-between gap-3 rounded-xl border bg-card px-4 hover:bg-muted/50 sm:w-auto sm:justify-start"
          >
            <span className="flex items-center gap-3 text-base font-semibold">
              Start with an empty draft
            </span>
            <ArrowRight className="h-4 w-4 sm:ml-2" />
          </Button>
        </div>
      </Panel.Body>

      <ConfirmReplaceDialog
        pendingPath={pendingPath}
        primaryDraft={primaryDraft}
        recentOrders={recentOrders}
        usualsCount={usualsCount}
        onCancel={() => setPendingPath(null)}
        onConfirm={() => {
          if (pendingPath) {
            runPath(
              pendingPath.kind,
              pendingPath.targetDate,
              pendingPath.reorderSourceId,
            )
            setPendingPath(null)
          }
        }}
      />
    </Panel>
  )
}

// Eye icon import is preserved for the Order History page; left here as a
// placeholder so the lint stays clean while the wider restructure lands.
void Eye
void RotateCcw

// ---- ConfirmReplaceDialog ----------------------------------------------

interface ConfirmReplaceDialogProps {
  pendingPath: PendingPath | null
  primaryDraft: StartOrderDrawerProps['primaryDraft']
  recentOrders: RecentOrderForDrawer[]
  usualsCount: number
  onCancel: () => void
  onConfirm: () => void
}

function ConfirmReplaceDialog({
  pendingPath,
  primaryDraft,
  recentOrders,
  usualsCount,
  onCancel,
  onConfirm,
}: ConfirmReplaceDialogProps) {
  const open = pendingPath !== null
  if (!primaryDraft || !pendingPath) {
    return (
      <Panel
        open={open}
        onOpenChange={onCancel}
        variant="centered"
        srTitle="Replace draft"
      >
        <Panel.Body className="px-4 py-4 text-sm">
          No draft to replace.
        </Panel.Body>
      </Panel>
    )
  }

  const reorderSource = pendingPath.reorderSourceId
    ? recentOrders.find((o) => o.id === pendingPath.reorderSourceId)
    : null

  const replacementSummary =
    pendingPath.kind === 'reorder' && reorderSource
      ? `the order from ${formatDeliveryDate(reorderSource.deliveryDate)} (${reorderSource.itemCount} items)`
      : pendingPath.kind === 'usuals'
        ? `your ${usualsCount} usuals`
        : 'a fresh empty draft'

  return (
    <Panel
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      variant="centered"
      srTitle="Replace draft"
    >
      <Panel.Header>
        <h2 className="flex-1 text-base font-semibold">Replace your draft?</h2>
      </Panel.Header>
      <Panel.Body className="space-y-3 px-4 py-4 text-sm">
        <p>
          You have a draft for{' '}
          {formatDeliveryDate(primaryDraft.deliveryDate)} with{' '}
          {primaryDraft.itemCount}{' '}
          {primaryDraft.itemCount === 1 ? 'item' : 'items'}.
        </p>
        <p className="text-muted-foreground">
          Replacing it with {replacementSummary} will discard your in-flight
          changes.
        </p>
      </Panel.Body>
      <Panel.Footer className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Replace
        </Button>
      </Panel.Footer>
    </Panel>
  )
}
