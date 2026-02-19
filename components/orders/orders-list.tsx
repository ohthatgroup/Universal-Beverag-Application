'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import type { Order, OrderStatus } from '@/lib/types'
import { addDays, formatCurrency, formatDeliveryDate, getStatusIcon, getStatusLabel, todayISODate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  currentOrders: Order[]
  pastOrders: Order[]
  showPrices: boolean
}

function StatusText({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span>{getStatusIcon(status)}</span>
      <span>{getStatusLabel(status)}</span>
    </span>
  )
}

export function OrdersList({ token, currentOrders, pastOrders, showPrices }: OrdersListProps) {
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
        const payload = await response.json().catch(() => null)
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
        const payload = await response.json().catch(() => null)
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
    router.push(clonedOrderId ? `/c/${token}/order/link/${clonedOrderId}` : `/c/${token}/order/${deliveryDate}`)
    router.refresh()
  }

  const renderMobileCard = (order: Order, section: 'current' | 'past') => (
    <div key={order.id} className="border-b py-4 last:border-0">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{formatDeliveryDate(order.delivery_date)}</div>
          <div className="text-xs text-muted-foreground">
            {order.item_count} items
            {showPrices && <span> · {formatCurrency(order.total)}</span>}
          </div>
        </div>
        <StatusText status={order.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === 'draft' && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/c/${token}/order/link/${order.id}`}>
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

        {order.status === 'submitted' && section === 'current' && (
          <Button
            size="sm"
            variant="outline"
            disabled={cancellingOrderId === order.id}
            onClick={() => cancelOrder(order.id)}
          >
            {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
          </Button>
        )}

        {section === 'past' && (
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

        {order.status !== 'draft' && section === 'current' && (
          <Button size="sm" variant="outline" onClick={() => openReorderDialog(order.id)}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reorder
          </Button>
        )}
      </div>
    </div>
  )

  const renderDesktopTable = (orders: Order[], section: 'current' | 'past') => (
    <div className="hidden md:block rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Items</th>
            {showPrices && <th className="px-4 py-3 text-right font-medium">Total</th>}
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{formatDeliveryDate(order.delivery_date)}</td>
              <td className="px-4 py-3 text-muted-foreground">{order.item_count}</td>
              {showPrices && (
                <td className="px-4 py-3 text-right">{formatCurrency(order.total)}</td>
              )}
              <td className="px-4 py-3">
                <StatusText status={order.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {order.status === 'draft' && (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/c/${token}/order/link/${order.id}`}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost">
                    <a href={`/api/portal/orders/${order.id}/csv?token=${token}`}>
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  {order.status === 'submitted' && section === 'current' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={cancellingOrderId === order.id}
                      onClick={() => cancelOrder(order.id)}
                    >
                      {cancellingOrderId === order.id ? '...' : 'Cancel'}
                    </Button>
                  )}
                  {order.status !== 'draft' && (
                    <Button size="sm" variant="ghost" onClick={() => openReorderDialog(order.id)}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {section === 'past' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteOrderId(order.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Current Orders */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Current Orders
        </h2>
        {currentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active orders.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden">
              {currentOrders.map((order) => renderMobileCard(order, 'current'))}
            </div>
            {/* Desktop table */}
            {renderDesktopTable(currentOrders, 'current')}
          </>
        )}
      </section>

      {/* Past Orders */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Previous Orders
        </h2>
        {pastOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No order history yet.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden">
              {pastOrders.map((order) => renderMobileCard(order, 'past'))}
            </div>
            {/* Desktop table */}
            {renderDesktopTable(pastOrders, 'past')}
          </>
        )}
      </section>

      {/* Reorder dialog with arrow date picker */}
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

      {/* Delete confirmation */}
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
