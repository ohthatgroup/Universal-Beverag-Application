import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency, formatDeliveryDate } from '@/lib/utils'

export default async function DashboardPage() {
  const context = await requirePageAuth(['salesman'])

  const [ordersCount, customersCount, productsCount, recentOrdersResponse] = await Promise.all([
    context.supabase.from('orders').select('*', { head: true, count: 'exact' }),
    context.supabase
      .from('profiles')
      .select('*', { head: true, count: 'exact' })
      .eq('role', 'customer'),
    context.supabase.from('products').select('*', { head: true, count: 'exact' }),
    context.supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (recentOrdersResponse.error) {
    throw recentOrdersResponse.error
  }

  const cards = [
    { label: 'Orders', value: ordersCount.count ?? 0, href: '/admin/orders' },
    { label: 'Customers', value: customersCount.count ?? 0, href: '/admin/customers' },
    { label: 'Products', value: productsCount.count ?? 0, href: '/admin/catalog' },
  ]

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-2">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="space-y-1 p-3">
              <div className="text-xs text-muted-foreground">{card.label}</div>
              <div className="text-xl font-semibold">{card.value}</div>
              <Link className="text-xs underline" href={card.href}>
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(recentOrdersResponse.data ?? []).map((order) => (
            <div key={order.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{formatDeliveryDate(order.delivery_date)}</div>
              <div className="text-xs text-muted-foreground">
                {order.status} • {order.item_count} items • {formatCurrency(order.total)}
              </div>
              <Link className="mt-1 inline-block text-xs underline" href={`/admin/orders/${order.id}`}>
                View order
              </Link>
            </div>
          ))}

          {(recentOrdersResponse.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
