import Link from 'next/link'
import type { OrderStatus } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDeliveryDate, getStatusVariant } from '@/lib/utils'

interface CustomerReadonlyLineItem {
  id: string
  title: string
  details: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface CustomerOrderReadonlyProps {
  order: {
    id: string
    delivery_date: string
    status: OrderStatus
    item_count: number
    total: number
    submitted_at: string | null
    delivered_at: string | null
  }
  items: CustomerReadonlyLineItem[]
  showPrices: boolean
}

export function CustomerOrderReadonly({ order, items, showPrices }: CustomerOrderReadonlyProps) {
  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Order Details</h1>
          <p className="text-sm text-muted-foreground">{formatDeliveryDate(order.delivery_date)}</p>
        </div>
        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <Link className="underline" href="/orders">
          Back to Orders
        </Link>
        <a className="underline" href={`/api/orders/${order.id}/csv`}>
          Download CSV
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>Items: {order.item_count ?? 0}</div>
          {showPrices && <div>Total: {formatCurrency(order.total ?? 0)}</div>}
          <div>Submitted: {order.submitted_at ? new Date(order.submitted_at).toLocaleString() : '—'}</div>
          <div>Delivered: {order.delivered_at ? new Date(order.delivered_at).toLocaleString() : '—'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{item.title}</div>
              {item.details && <div className="text-xs text-muted-foreground">{item.details}</div>}
              <div className="mt-1 text-xs text-muted-foreground">
                Qty {item.quantity}
                {showPrices && (
                  <>
                    {' '}
                    • {formatCurrency(item.unitPrice)} each • {formatCurrency(item.lineTotal)}
                  </>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && <p className="text-sm text-muted-foreground">No line items.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
