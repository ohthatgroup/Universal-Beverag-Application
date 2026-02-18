'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Order, OrderStatus } from '@/lib/types'
import { addDays, formatCurrency, formatDeliveryDate, getStatusLabel, todayISODate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [reorderDate, setReorderDate] = useState(addDays(todayISODate(), 1))
  const [selectedReorderOrderId, setSelectedReorderOrderId] = useState<string | null>(null)
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false)
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openReorderDialog = (orderId: string) => {
    setError(null)
    setSelectedReorderOrderId(orderId)
    setReorderDate(addDays(todayISODate(), 1))
    setIsReorderDialogOpen(true)
  }

  const cloneOrder = async () => {
    if (!selectedReorderOrderId) {
      setError('Choose an order to reorder')
      return
    }

    if (!reorderDate) {
      setError('Choose a reorder delivery date first')
      return
    }

    setError(null)
    setReorderingOrderId(selectedReorderOrderId)

    const response = await fetch(`/api/orders/${selectedReorderOrderId}/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deliveryDate: reorderDate }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { data?: { order?: { id: string; delivery_date: string } } }
      | { error?: { message?: string } }
      | null

    setReorderingOrderId(null)

    if (!response.ok) {
      setError(payload && 'error' in payload ? payload.error?.message ?? 'Reorder failed' : 'Reorder failed')
      return
    }

    const clonedOrderId = payload && 'data' in payload ? payload.data?.order?.id : null
    const deliveryDate =
      payload && 'data' in payload ? payload.data?.order?.delivery_date ?? reorderDate : reorderDate

    setIsReorderDialogOpen(false)
    setSelectedReorderOrderId(null)
    router.push(clonedOrderId ? `/order/link/${clonedOrderId}` : `/order/${deliveryDate}`)
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
                    <Link href={`/order/link/${order.id}`}>Edit</Link>
                  </Button>
                )}

                <Button asChild size="sm" variant="outline">
                  <a href={`/api/orders/${order.id}/csv`}>CSV</a>
                </Button>

                {order.status !== 'draft' && (
                  <Button size="sm" variant="secondary" onClick={() => openReorderDialog(order.id)}>
                    Reorder
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
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Current Orders</h2>
        {renderOrders(currentOrders, 'No active orders yet.')}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Past Orders</h2>
        {renderOrders(pastOrders, 'No order history yet.')}
      </section>

      <Dialog open={isReorderDialogOpen} onOpenChange={setIsReorderDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reorder For...</DialogTitle>
            <DialogDescription>Pick a delivery date and clone this order into a new draft.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              id="reorder-date"
              type="date"
              min={todayISODate()}
              value={reorderDate}
              onChange={(event) => setReorderDate(event.target.value)}
            />
            <Button
              className="w-full"
              onClick={cloneOrder}
              disabled={
                !selectedReorderOrderId ||
                (selectedReorderOrderId !== null && reorderingOrderId === selectedReorderOrderId)
              }
            >
              {selectedReorderOrderId !== null && reorderingOrderId === selectedReorderOrderId
                ? 'Cloning...'
                : 'Clone Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
