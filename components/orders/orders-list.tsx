'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { buildCustomerOrderDeepLink, buildCustomerPortalOrderDatePath } from '@/lib/portal-links'
import type { Order } from '@/lib/types'
import { addDays, formatDeliveryDate, todayISODate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { StatusDot } from '@/components/ui/status-dot'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface OrdersListProps {
  token: string
  orders: Order[]
  variant: 'current' | 'past'
  showPrices: boolean
  emptyMessage?: string
}

export function OrdersList({ token, orders, variant, showPrices, emptyMessage }: OrdersListProps) {
  const router = useRouter()
  const [reorderDate, setReorderDate] = useState(addDays(todayISODate(), 1))
  const [selectedReorderOrderId, setSelectedReorderOrderId] = useState<string | null>(null)
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false)
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null)
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const portalHeaders = {
    'Content-Type': 'application/json',
    'X-Customer-Token': token,
  }

  const shiftDate = (days: number) => {
    setReorderDate((prev) => addDays(prev, days))
  }

  const getOrderHref = (orderId: string) => buildCustomerOrderDeepLink(token, orderId) ?? '/portal'

  const openReorderDialog = (orderId: string) => {
    setError(null)
    setSelectedReorderOrderId(orderId)
    setReorderDate(addDays(todayISODate(), 1))
    setIsReorderDialogOpen(true)
  }

  const cancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId)
    setError(null)
    try {
      const response = await fetch(`/api/portal/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: portalHeaders,
        body: JSON.stringify({ status: 'draft' }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? 'Failed to cancel order')
        return
      }
      router.refresh()
    } finally {
      setCancellingOrderId(null)
    }
  }

  const deleteOrder = async () => {
    if (!deleteOrderId) return
    setDeletingOrderId(deleteOrderId)
    setError(null)
    try {
      const response = await fetch(`/api/portal/orders/${deleteOrderId}`, {
        method: 'DELETE',
        headers: { 'X-Customer-Token': token },
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? 'Failed to delete order')
        return
      }
      setDeleteOrderId(null)
      router.refresh()
    } finally {
      setDeletingOrderId(null)
    }
  }

  const cloneOrder = async () => {
    if (!selectedReorderOrderId) return
    if (!reorderDate) {
      setError('Choose a delivery date')
      return
    }

    setError(null)
    setReorderingOrderId(selectedReorderOrderId)

    const response = await fetch(`/api/portal/orders/${selectedReorderOrderId}/clone`, {
      method: 'POST',
      headers: portalHeaders,
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
    const destination = clonedOrderId
      ? buildCustomerOrderDeepLink(token, clonedOrderId)
      : buildCustomerPortalOrderDatePath(token, deliveryDate)
    if (destination) {
      router.push(destination)
    }
    router.refresh()
  }

  const renderCard = (order: Order) => (
    <div key={order.id} className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <StatusDot status={order.status} className="mt-1.5" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{formatDeliveryDate(order.delivery_date)}</div>
          <div className="text-xs text-muted-foreground">
            {order.item_count} items
            {showPrices && <span> · <Money value={order.total} /></span>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === 'draft' && (
          <Button asChild size="sm" variant="outline">
            <Link href={getOrderHref(order.id)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        )}

        <Button asChild size="sm" variant="outline">
          <a href={`/api/portal/orders/${order.id}/csv?token=${token}`}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            CSV
          </a>
        </Button>

        {order.status === 'submitted' && variant === 'current' && (
          <Button
            size="sm"
            variant="outline"
            disabled={cancellingOrderId === order.id}
            onClick={() => cancelOrder(order.id)}
          >
            {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
          </Button>
        )}

        {variant === 'past' && (
          <>
            <Button size="sm" variant="outline" onClick={() => openReorderDialog(order.id)}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Reorder
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOrderId(order.id)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </>
        )}

        {order.status !== 'draft' && variant === 'current' && (
          <Button size="sm" variant="outline" onClick={() => openReorderDialog(order.id)}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reorder
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {emptyMessage ?? (variant === 'current' ? 'No active orders.' : 'No order history yet.')}
        </p>
      ) : (
        <div className="space-y-2">{orders.map(renderCard)}</div>
      )}

      <Dialog open={isReorderDialogOpen} onOpenChange={setIsReorderDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reorder</DialogTitle>
            <DialogDescription>Pick a delivery date for the new order.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center font-medium">
                {formatDeliveryDate(reorderDate)}
              </span>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
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
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this order and its items. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteOrder}
              disabled={!!deletingOrderId}
            >
              {deletingOrderId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
