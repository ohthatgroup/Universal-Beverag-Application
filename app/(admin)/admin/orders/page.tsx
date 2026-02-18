import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency, formatDeliveryDate, getStatusVariant } from '@/lib/utils'

export default async function AdminOrdersPage() {
  const context = await requirePageAuth(['salesman'])

  const [ordersResponse, customersResponse] = await Promise.all([
    context.supabase
      .from('orders')
      .select('*')
      .order('delivery_date', { ascending: false })
      .limit(100),
    context.supabase
      .from('profiles')
      .select('id,business_name,contact_name')
      .eq('role', 'customer'),
  ])

  if (ordersResponse.error) {
    throw ordersResponse.error
  }

  if (customersResponse.error) {
    throw customersResponse.error
  }

  const customerById = new Map(
    (customersResponse.data ?? []).map((customer) => [
      customer.id,
      customer.business_name || customer.contact_name || customer.id,
    ])
  )

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Orders</h1>

      <div className="space-y-3">
        {(ordersResponse.data ?? []).map((order) => (
          <Card key={order.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{formatDeliveryDate(order.delivery_date)}</div>
                  <div className="text-xs text-muted-foreground">
                    {customerById.get(order.customer_id) ?? order.customer_id}
                  </div>
                </div>
                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                {order.item_count} items • {formatCurrency(order.total)}
              </div>

              <div className="flex gap-2 text-sm">
                <Link className="underline" href={`/admin/orders/${order.id}`}>
                  View
                </Link>
                <a className="underline" href={`/api/orders/${order.id}/csv`}>
                  CSV
                </a>
              </div>
            </CardContent>
          </Card>
        ))}

        {(ordersResponse.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No orders found.</p>
        )}
      </div>
    </div>
  )
}
