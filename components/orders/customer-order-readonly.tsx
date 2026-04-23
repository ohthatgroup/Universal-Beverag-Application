import { Download } from 'lucide-react'
import type { OrderStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { buildCustomerPortalBasePath } from '@/lib/portal-links'
import { formatDeliveryDate } from '@/lib/utils'
import { Money } from '@/components/ui/money'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { getStatusLabel } from '@/lib/utils'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { EmptyState } from '@/components/ui/empty-state'

interface CustomerReadonlyLineItem {
  id: string
  title: string
  details: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface CustomerOrderReadonlyProps {
  token: string
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

export function CustomerOrderReadonly({ token, order, items, showPrices }: CustomerOrderReadonlyProps) {
  const homeHref = buildCustomerPortalBasePath(token) ?? '/portal'

  return (
    <div className="space-y-4 p-4 pb-20 md:pb-4">
      <PortalPageHeader
        back={{ href: homeHref }}
        title={formatDeliveryDate(order.delivery_date)}
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <OrderStatusDot status={order.status} />
            {getStatusLabel(order.status)}
          </span>
        }
        action={
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/portal/orders/${order.id}/csv?token=${token}`}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </a>
          </Button>
        }
      />

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{order.item_count ?? 0} items</span>
        {showPrices && <Money value={order.total ?? 0} />}
        {order.submitted_at && (
          <span>Submitted {new Date(order.submitted_at).toLocaleDateString()}</span>
        )}
        {order.delivered_at && (
          <span>Delivered {new Date(order.delivered_at).toLocaleDateString()}</span>
        )}
      </div>

      <Separator />

      {/* Items */}
      <div className="space-y-0">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between border-b py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">{item.title}</div>
              {item.details && (
                <div className="text-xs text-muted-foreground">{item.details}</div>
              )}
              <div className="text-xs text-muted-foreground mt-0.5">
                Qty {item.quantity}
                {showPrices && <span> · <Money value={item.unitPrice} /> each</span>}
              </div>
            </div>
            {showPrices && (
              <div className="ml-4"><Money value={item.lineTotal} className="text-sm" /></div>
            )}
          </div>
        ))}

        {items.length === 0 && <EmptyState title="No line items" />}
      </div>

      {/* Total */}
      {showPrices && items.length > 0 && (
        <>
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <span>{order.item_count} items</span>
            <Money value={order.total ?? 0} />
          </div>
        </>
      )}
    </div>
  )
}
