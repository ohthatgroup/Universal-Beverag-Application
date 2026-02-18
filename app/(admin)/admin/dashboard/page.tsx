import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency, formatDeliveryDate, todayISODate } from '@/lib/utils'

export default async function DashboardPage() {
  const context = await requirePageAuth(['salesman'])
  const today = todayISODate()

  const [ordersTodayCount, newOrdersCount, activeCustomersCount, pendingDeliveryCount, recentOrdersResponse, customersResponse] =
    await Promise.all([
      context.supabase
        .from('orders')
        .select('*', { head: true, count: 'exact' })
        .eq('delivery_date', today),
      context.supabase
        .from('orders')
        .select('*', { head: true, count: 'exact' })
        .eq('status', 'draft'),
      context.supabase
        .from('profiles')
        .select('*', { head: true, count: 'exact' })
        .eq('role', 'customer'),
      context.supabase
        .from('orders')
        .select('*', { head: true, count: 'exact' })
        .eq('status', 'submitted'),
      context.supabase
        .from('orders')
        .select('id,customer_id,delivery_date,item_count,total,status,created_at')
        .order('created_at', { ascending: false })
        .limit(8),
      context.supabase
        .from('profiles')
        .select('id,business_name,contact_name,email')
        .eq('role', 'customer'),
    ])

  if (recentOrdersResponse.error) {
    throw recentOrdersResponse.error
  }

  if (customersResponse.error) {
    throw customersResponse.error
  }

  const customerById = new Map(
    (customersResponse.data ?? []).map((customer) => [
      customer.id,
      customer.business_name || customer.contact_name || customer.email || customer.id,
    ])
  )

  const cards = [
    {
      label: 'Orders Today',
      value: ordersTodayCount.count ?? 0,
      href: `/admin/orders?deliveryDate=${today}`,
    },
    { label: 'New Orders', value: newOrdersCount.count ?? 0, href: '/admin/orders?status=draft' },
    { label: 'Active Cust.', value: activeCustomersCount.count ?? 0, href: '/admin/customers' },
    {
      label: 'Pending Delivery',
      value: pendingDeliveryCount.count ?? 0,
      href: '/admin/orders?status=submitted',
    },
  ]

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Today - {formatDeliveryDate(today)}</p>

      <div className="grid grid-cols-2 gap-2">
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
              <div className="font-medium">
                {(order.customer_id ? customerById.get(order.customer_id) : null) ??
                  order.customer_id ??
                  'Unknown customer'}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDeliveryDate(order.delivery_date)} - {order.item_count ?? 0} items - {formatCurrency(order.total ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground">{order.status}</div>
              <Link className="mt-1 inline-block text-xs underline" href={`/admin/orders/${order.id}`}>
                View order
              </Link>
            </div>
          ))}

          {(recentOrdersResponse.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
        </CardContent>
      </Card>

      <div>
        <Link className="text-sm underline" href="/admin/orders">
          View All Orders
        </Link>
      </div>
    </div>
  )
}
