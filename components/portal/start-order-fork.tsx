'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { ReorderList, type ReorderableOrder } from '@/components/portal/reorder-list'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import { addDays, formatDeliveryDate, todayISODate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface StartOrderForkProps {
  token: string
  /** The customer's next-available delivery date. */
  nextDeliveryDate: string
  /** The day after `nextDeliveryDate` — fork's default when a draft already occupies the next date. */
  nextNextDeliveryDate: string
  /** In-flight draft on or after `nextDeliveryDate`. Null means no draft. */
  primaryDraft: {
    id: string
    deliveryDate: string
    itemCount: number
    updatedAt: string
  } | null
  /** Total submitted+delivered orders (drives progressive reveal). */
  submittedOrderCount: number
  /**
   * Recent submitted/delivered orders, newest first. The ReorderList
   * surfaces the first 3 with a "Show more" expand.
   */
  recentOrders: ReorderableOrder[]
}

type PathKind = 'reorder' | 'usuals' | 'scratch'

interface PendingPath {
  kind: PathKind
  targetDate: string
  /** When `kind === 'reorder'`, the source order id being cloned. */
  reorderSourceId?: string
}

/**
 * The single visually distinct ordering panel — holds every entry
 * point into the order flow:
 *
 *   1. Resume Draft (when one exists) — accent figure at the top
 *   2. Reorder a recent order (list, top 3 with Show more)
 *   3. Order your usuals (if ≥ 3 submitted orders)
 *   4. Start from scratch
 *
 * One bordered card so the customer sees all four paths in one zone.
 */
export function StartOrderFork({
  token,
  nextDeliveryDate,
  nextNextDeliveryDate,
  primaryDraft,
  submittedOrderCount,
  recentOrders,
}: StartOrderForkProps) {
  const draftBlocksNext =
    primaryDraft !== null && primaryDraft.deliveryDate === nextDeliveryDate
  const initialForkDate = draftBlocksNext ? nextNextDeliveryDate : nextDeliveryDate

  const [forkDate, setForkDate] = useState(initialForkDate)
  const [pendingPath, setPendingPath] = useState<PendingPath | null>(null)

  const showReorder = submittedOrderCount >= 1 && recentOrders.length > 0
  const showUsuals = submittedOrderCount >= 3
  const showFork = showReorder || showUsuals || primaryDraft !== null

  const draftAtForkDate =
    primaryDraft !== null && primaryDraft.deliveryDate === forkDate

  const draftHref = primaryDraft
    ? buildCustomerOrderDeepLink(token, primaryDraft.id) ?? '#'
    : '#'

  const handlePath = (kind: PathKind, reorderSourceId?: string) => {
    if (draftAtForkDate) {
      setPendingPath({ kind, targetDate: forkDate, reorderSourceId })
      return
    }
    runPath(kind, forkDate, reorderSourceId)
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
          `Reorder ${formatDeliveryDate(source.deliveryDate)} (${source.itemCount} items) — would clone into a draft for ${friendlyDate} and drop into the order builder.`,
        )
      }
    } else if (kind === 'usuals') {
      window.alert(
        `Order your usuals — would create a draft for ${friendlyDate} pre-filled with the customer's usuals and drop into the order builder.`,
      )
    } else {
      window.alert(
        `Start from scratch — would create an empty draft for ${friendlyDate} and drop into the order builder.`,
      )
    }
  }

  const onChangeDate: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value
    if (value && value >= todayISODate()) setForkDate(value)
  }

  const minForkDate =
    primaryDraft !== null && primaryDraft.deliveryDate >= todayISODate()
      ? addDays(primaryDraft.deliveryDate, 1)
      : todayISODate()

  // ---- Brand-new customer (no history, no draft): single Start order CTA ----
  if (!showFork) {
    return (
      <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
        <div className="space-y-4">
          <DateLabel
            label="Order for"
            date={forkDate}
            minDate={minForkDate}
            onChange={onChangeDate}
          />
          <PathRow
            label="Start order"
            variant="accent"
            onClick={() => handlePath('scratch')}
          />
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* 1. Resume Draft block — figure when a draft is in flight. */}
      {primaryDraft && (
        <Link
          href={draftHref}
          className="group flex items-center gap-3 bg-accent px-5 py-4 text-accent-foreground transition-colors hover:bg-accent/90 md:px-6"
        >
          <OrderStatusDot status="draft" className="bg-accent-foreground/30" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">
              Resume draft for {formatDeliveryDate(primaryDraft.deliveryDate)}
            </div>
            <div className="text-xs text-accent-foreground/80">
              {primaryDraft.itemCount}{' '}
              {primaryDraft.itemCount === 1 ? 'item' : 'items'}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* 2. Date label + Reorder list + Usuals + Scratch — all the
          new-order entry points, inside the same card so the customer
          sees them as one decision surface. */}
      <div className="space-y-4 p-5 md:p-6">
        <DateLabel
          label={primaryDraft ? 'for delivery' : 'Order for'}
          date={forkDate}
          minDate={minForkDate}
          onChange={onChangeDate}
        />

        {showReorder && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reorder a recent order
            </h3>
            <ReorderList
              orders={recentOrders}
              onReorder={(orderId) => handlePath('reorder', orderId)}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
          {showUsuals && (
            <PathRow
              icon={<Sparkles className="h-4 w-4" />}
              label="Order your usuals"
              variant="outline"
              onClick={() => handlePath('usuals')}
            />
          )}
          <PathRow
            label="Start from scratch"
            variant="outline"
            onClick={() => handlePath('scratch')}
          />
        </div>
      </div>

      <ConfirmReplaceDialog
        pendingPath={pendingPath}
        primaryDraft={primaryDraft}
        recentOrders={recentOrders}
        onCancel={() => setPendingPath(null)}
        onConfirm={() => {
          if (pendingPath) {
            runPath(pendingPath.kind, pendingPath.targetDate, pendingPath.reorderSourceId)
            setPendingPath(null)
          }
        }}
      />
    </section>
  )
}

// ---- DateLabel ---------------------------------------------------------

interface DateLabelProps {
  label: string
  date: string
  minDate: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
}

function DateLabel({ label, date, minDate, onChange }: DateLabelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Calendar className="h-3.5 w-3.5" aria-hidden />
      <span>
        {label}{' '}
        <span className="font-medium text-foreground">
          {formatDeliveryDate(date)}
        </span>
      </span>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker?.()}
        className="relative text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        Change date
        <input
          ref={inputRef}
          type="date"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={date}
          min={minDate}
          onChange={onChange}
          aria-label="Pick a delivery date"
        />
      </button>
    </div>
  )
}

// ---- PathRow -----------------------------------------------------------

interface PathRowProps {
  label: string
  icon?: React.ReactNode
  variant: 'accent' | 'outline'
  onClick: () => void
}

function PathRow({ label, icon, variant, onClick }: PathRowProps) {
  return (
    <Button
      variant={variant}
      size="lg"
      onClick={onClick}
      className={cn(
        // Mobile: full row, generous tap target.
        // Desktop (sm+): size to content, left-anchored.
        'h-12 w-full justify-between gap-3 rounded-xl px-4',
        'sm:w-auto sm:justify-start',
        variant === 'outline' && 'border bg-background hover:bg-muted/50',
      )}
    >
      <span className="flex items-center gap-3 text-base font-semibold">
        {icon}
        {label}
      </span>
      <ArrowRight className="h-4 w-4 sm:ml-2" />
    </Button>
  )
}

// ---- ConfirmReplaceDialog ----------------------------------------------

interface ConfirmReplaceDialogProps {
  pendingPath: PendingPath | null
  primaryDraft: StartOrderForkProps['primaryDraft']
  recentOrders: ReorderableOrder[]
  onCancel: () => void
  onConfirm: () => void
}

function ConfirmReplaceDialog({
  pendingPath,
  primaryDraft,
  recentOrders,
  onCancel,
  onConfirm,
}: ConfirmReplaceDialogProps) {
  const open = pendingPath !== null
  if (!primaryDraft || !pendingPath) {
    return (
      <Panel open={open} onOpenChange={onCancel} variant="centered" srTitle="Replace draft">
        <Panel.Body className="px-4 py-4 text-sm">No draft to replace.</Panel.Body>
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
        ? 'your usuals'
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
          You have a draft for {formatDeliveryDate(primaryDraft.deliveryDate)}{' '}
          with {primaryDraft.itemCount}{' '}
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
