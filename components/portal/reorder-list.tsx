'use client'

import { useState } from 'react'
import { ArrowRight, ChevronDown, Eye, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { Panel } from '@/components/ui/panel'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { formatDeliveryDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export interface ReorderableOrder {
  id: string
  deliveryDate: string
  itemCount: number
  total: number
  status: 'submitted' | 'delivered'
}

interface ReorderListProps {
  orders: ReorderableOrder[]
  /**
   * Tell the parent the customer wants to reorder this order. The parent
   * decides whether to show a confirm-replace dialog (draft conflict) or
   * to fire the reorder action directly.
   */
  onReorder: (orderId: string) => void
  /** Initial visible count. Default 3. */
  initialVisible?: number
}

/**
 * Above-the-fold reorder picker. Shows the most-recent submitted/delivered
 * orders, defaulting to 3 with "Show more" expansion. Each row has Preview
 * (opens a bottom-sheet read-only summary with a Reorder CTA) and Reorder.
 */
export function ReorderList({
  orders,
  onReorder,
  initialVisible = 3,
}: ReorderListProps) {
  const [showAll, setShowAll] = useState(false)
  const [previewOrder, setPreviewOrder] = useState<ReorderableOrder | null>(null)

  if (orders.length === 0) return null

  const visible = showAll ? orders : orders.slice(0, initialVisible)
  const hiddenCount = Math.max(0, orders.length - initialVisible)

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {visible.map((order, index) => (
          <ReorderRow
            key={order.id}
            order={order}
            isPrimary={index === 0}
            onPreview={() => setPreviewOrder(order)}
            onReorder={() => onReorder(order.id)}
          />
        ))}
      </div>

      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Show {hiddenCount} more
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}

      <OrderPreviewSheet
        order={previewOrder}
        onClose={() => setPreviewOrder(null)}
        onReorder={(id) => {
          setPreviewOrder(null)
          onReorder(id)
        }}
      />
    </div>
  )
}

// ---- ReorderRow --------------------------------------------------------

interface ReorderRowProps {
  order: ReorderableOrder
  /** Render the primary row as accent-tinted, inverse colors. */
  isPrimary: boolean
  onPreview: () => void
  onReorder: () => void
}

function ReorderRow({
  order,
  isPrimary,
  onPreview,
  onReorder,
}: ReorderRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        isPrimary
          ? 'border-accent/40 bg-accent/5 hover:bg-accent/10'
          : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <OrderStatusDot status={order.status} className="shrink-0" />

      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-semibold">
          {formatDeliveryDate(order.deliveryDate)}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
          <Money value={order.total} className="font-normal" />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onPreview}
        className="h-9 w-9 shrink-0 px-0"
        aria-label={`Preview order from ${formatDeliveryDate(order.deliveryDate)}`}
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant={isPrimary ? 'accent' : 'outline'}
        size="sm"
        onClick={onReorder}
        className="shrink-0"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reorder
      </Button>
    </div>
  )
}

// ---- OrderPreviewSheet -------------------------------------------------

interface OrderPreviewSheetProps {
  order: ReorderableOrder | null
  onClose: () => void
  onReorder: (orderId: string) => void
}

interface PreviewLineItem {
  productName: string
  packLabel: string | null
  quantity: number
  lineTotal: number
}

// TODO: wire up GET /api/portal/orders/[id]/items in mock-mode replacement.
// In the design phase the sheet shows a placeholder explaining what would
// load + a representative shape for the rows.
function getMockPreviewItems(order: ReorderableOrder): PreviewLineItem[] {
  // Same items repeated based on the order's `itemCount`. Real implementation
  // hits the existing items endpoint for this order id.
  const archetypes: PreviewLineItem[] = [
    { productName: 'Coca-Cola Original', packLabel: '24/12oz', quantity: 4, lineTotal: 156.0 },
    { productName: 'Sprite', packLabel: '24/12oz', quantity: 2, lineTotal: 78.0 },
    { productName: 'Dasani Purified Water', packLabel: '24/16.9oz', quantity: 6, lineTotal: 90.0 },
    { productName: 'Monster Energy Original', packLabel: '24/16oz', quantity: 1, lineTotal: 47.99 },
    { productName: 'Bai Coconut', packLabel: '12/18oz', quantity: 1, lineTotal: 24.0 },
  ]
  return archetypes.slice(0, Math.max(1, Math.min(order.itemCount, archetypes.length)))
}

function OrderPreviewSheet({
  order,
  onClose,
  onReorder,
}: OrderPreviewSheetProps) {
  const open = order !== null

  return (
    <Panel
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      variant="bottom-sheet"
      width="content"
      srTitle={
        order ? `Order from ${formatDeliveryDate(order.deliveryDate)}` : 'Order preview'
      }
    >
      <Panel.Header>
        <div className="flex flex-1 flex-col">
          <h2 className="text-base font-semibold">
            {order ? formatDeliveryDate(order.deliveryDate) : ''}
          </h2>
          {order && (
            <p className="text-xs text-muted-foreground">
              {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
              <Money value={order.total} className="font-normal" />
            </p>
          )}
        </div>
      </Panel.Header>

      <Panel.Body className="px-4 py-3">
        {order ? (
          <PreviewItemList items={getMockPreviewItems(order)} />
        ) : null}
      </Panel.Body>

      <Panel.Footer>
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          onClick={() => {
            if (order) onReorder(order.id)
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Reorder these items
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Panel.Footer>
    </Panel>
  )
}

function PreviewItemList({ items }: { items: PreviewLineItem[] }) {
  return (
    <ul className="divide-y divide-foreground/10">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-baseline gap-3 py-2.5 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.productName}</p>
            {item.packLabel && (
              <p className="text-xs text-muted-foreground">{item.packLabel}</p>
            )}
          </div>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            × {item.quantity}
          </span>
          <Money
            value={item.lineTotal}
            className="w-16 shrink-0 text-right font-normal"
          />
        </li>
      ))}
    </ul>
  )
}
