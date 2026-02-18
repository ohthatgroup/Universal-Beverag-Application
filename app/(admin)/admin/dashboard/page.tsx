import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency, formatDeliveryDate, getStatusIcon, getStatusLabel, todayISODate } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

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

  const stats = [
    {
      label: 'Orders Today',
      value: ordersTodayCount.count ?? 0,
      href: `/admin/orders?deliveryDate=${today}`,
    },
    { label: 'New Orders', value: newOrdersCount.count ?? 0, href: '/admin/orders?status=draft' },
    { label: 'Customers', value: activeCustomersCount.count ?? 0, href: '/admin/customers' },
    {
      label: 'Pending Delivery',
      value: pendingDeliveryCount.count ?? 0,
      href: '/admin/orders?status=submitted',
    },
  ]

  const recentOrders = recentOrdersResponse.data ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{formatDeliveryDate(today)}</p>
      </div>

      {/* Stat cards — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <>
            {/* Mobile: card stack */}
            <div className="space-y-0 md:hidden">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between border-b py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {(order.customer_id ? customerById.get(order.customer_id) : null) ??
                        'Unknown customer'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDeliveryDate(order.delivery_date)} · {order.item_count ?? 0} items · {formatCurrency(order.total ?? 0)}
                    </div>
                  </div>
                  <span className="ml-3 text-sm">
                    {getStatusIcon(order.status as OrderStatus)} {getStatusLabel(order.status as OrderStatus)}
                  </span>
                </Link>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Items</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                          {(order.customer_id ? customerById.get(order.customer_id) : null) ??
                            'Unknown customer'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDeliveryDate(order.delivery_date)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {order.item_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(order.total ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusIcon(order.status as OrderStatus)} {getStatusLabel(order.status as OrderStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
