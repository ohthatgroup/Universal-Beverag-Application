'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Order, OrderStatus } from '@/lib/types'
import { formatCurrency, formatDeliveryDate, getStatusLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface OrdersListProps {
  currentOrders: Order[]
  pastOrders: Order[]
  showPrices: boolean
}

function statusVariant(status: OrderStatus): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'draft':
      return 'outline'
    case 'submitted':
      return 'default'
    case 'delivered':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function OrdersList({ currentOrders, pastOrders, showPrices }: OrdersListProps) {
  const router = useRouter()
  const [reorderDate, setReorderDate] = useState('')
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cloneOrder = async (orderId: string) => {
    if (!reorderDate) {
      setError('Choose a reorder delivery date first')
      return
    }

    setError(null)
    setReorderingOrderId(orderId)

    const response = await fetch(`/api/orders/${orderId}/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deliveryDate: reorderDate }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { data?: { order?: { delivery_date: string } } }
      | { error?: { message?: string } }
      | null

    setReorderingOrderId(null)

    if (!response.ok) {
      setError(payload && 'error' in payload ? payload.error?.message ?? 'Reorder failed' : 'Reorder failed')
      return
    }

    const deliveryDate =
      payload && 'data' in payload && payload.data?.order?.delivery_date
        ? payload.data.order.delivery_date
        : reorderDate

    router.push(`/order/${deliveryDate}`)
    router.refresh()
  }

  const renderOrders = (orders: Order[], emptyState: string) => {
    if (orders.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyState}</p>
    }

    return (
      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{formatDeliveryDate(order.delivery_date)}</div>
                  <div className="text-xs text-muted-foreground">{order.item_count} items</div>
                </div>
                <Badge variant={statusVariant(order.status)}>{getStatusLabel(order.status)}</Badge>
              </div>

              {showPrices && (
                <div className="text-sm text-muted-foreground">Total: {formatCurrency(order.total)}</div>
              )}

              <div className="flex flex-wrap gap-2">
                {order.status === 'draft' && (
                  <Button asChild size="sm">
                    <Link href={`/order/${order.delivery_date}`}>Continue</Link>
                  </Button>
                )}

                <Button asChild size="sm" variant="outline">
                  <a href={`/api/orders/${order.id}/csv`}>Download CSV</a>
                </Button>

                {order.status !== 'draft' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => cloneOrder(order.id)}
                    disabled={reorderingOrderId === order.id}
                  >
                    {reorderingOrderId === order.id ? 'Reordering...' : 'Reorder'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-md border p-3">
        <label className="text-sm font-medium" htmlFor="reorder-date">
          Reorder delivery date
        </label>
        <Input
          id="reorder-date"
          type="date"
          value={reorderDate}
          onChange={(event) => setReorderDate(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Applies when you tap Reorder on a submitted or delivered order.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Current Orders</h2>
        {renderOrders(currentOrders, 'No active orders yet.')}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Past Orders</h2>
        {renderOrders(pastOrders, 'No order history yet.')}
      </section>
    </div>
  )
}
