'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { OrderStatusDot } from '@/components/ui/status-dot'
import {
  OrderPreviewSheet,
  type OrderPreviewSummary,
} from '@/components/portal/order-preview-sheet'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import { addDays, formatDeliveryDate, todayISODate } from '@/lib/utils'
import type { Order } from '@/lib/types'

interface OrderHistoryListProps {
  token: string
  orders: Order[]
  showPrices: boolean
}

/**
 * Row list for /portal/[token]/orders. Each row shows:
 *   - Date + status + item count + total
 *   - View — opens the order-preview drawer (read-only line items + Reorder CTA)
 *   - Reorder — clones the order into a new draft for the next-available
 *     delivery date and routes the customer into the order builder.
 */
export function OrderHistoryList({
  token,
  orders,
  showPrices,
}: OrderHistoryListProps) {
  const router = useRouter()
  const [previewOrder, setPreviewOrder] = useState<OrderPreviewSummary | null>(null)
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        No orders yet.
      </p>
    )
  }

  const reorder = async (sourceOrderId: string) => {
    if (reorderingId) return
    setReorderingId(sourceOrderId)
    setError(null)

    // Default target: tomorrow. Real cutoff-aware date logic is a backend
    // follow-up (handoff entry 11), but next-day is right for the
    // overwhelming majority of cases and the customer can change the
    // delivery date inside the order builder if needed.
    const targetDate = addDays(todayISODate(), 1)

    try {
      const response = await fetch(
        `/api/portal/orders/${sourceOrderId}/clone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-Token': token,
          },
          body: JSON.stringify({ deliveryDate: targetDate }),
        },
      )

      const payload = (await response.json().catch(() => null)) as
        | { data?: { order?: { id: string; delivery_date: string } } }
        | { error?: { message?: string } }
        | null

      if (!response.ok) {
        const message =
          payload && 'error' in payload
            ? payload.error?.message ?? 'Reorder failed'
            : 'Reorder failed'
        setError(message)
        return
      }

      const clonedOrderId =
        payload && 'data' in payload ? payload.data?.order?.id : null
      if (!clonedOrderId) {
        setError('Reorder failed')
        return
      }

      const dest = buildCustomerOrderDeepLink(token, clonedOrderId)
      if (dest) router.push(dest)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reorder failed')
    } finally {
      setReorderingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="divide-y divide-foreground/10 overflow-hidden rounded-xl border bg-card">
        {orders.map((order) => {
          const isReordering = reorderingId === order.id
          return (
            <li
              key={order.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <OrderStatusDot status={order.status} className="shrink-0" />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold">
                  {formatDeliveryDate(order.delivery_date)}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground capitalize">
                  {order.status} · {order.item_count}{' '}
                  {order.item_count === 1 ? 'item' : 'items'}
                  {showPrices && (
                    <>
                      {' · '}
                      <Money value={order.total} className="font-normal" />
                    </>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPreviewOrder({
                    id: order.id,
                    deliveryDate: order.delivery_date,
                    itemCount: order.item_count,
                    total: order.total,
                    // /orders only lists submitted/delivered orders.
                    status: order.status as 'submitted' | 'delivered',
                  })
                }
                className="h-9 w-9 shrink-0 px-0"
                aria-label={`View order from ${formatDeliveryDate(order.delivery_date)}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={() => reorder(order.id)}
                disabled={isReordering}
                className="shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {isReordering ? 'Cloning…' : 'Reorder'}
              </Button>
            </li>
          )
        })}
      </ul>

      <OrderPreviewSheet
        token={token}
        order={previewOrder}
        showPrices={showPrices}
        onClose={() => setPreviewOrder(null)}
        onReorder={(sourceOrderId) => {
          setPreviewOrder(null)
          void reorder(sourceOrderId)
        }}
      />
    </div>
  )
}
