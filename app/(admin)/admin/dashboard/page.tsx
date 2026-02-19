import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { OrdersSection } from '@/components/admin/orders-section'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatDeliveryDate, todayISODate } from '@/lib/utils'

export default async function DashboardPage() {
  const context = await requirePageAuth(['salesman'])
  const today = todayISODate()

  const [
    ordersTodayCount,
    draftOrdersCount,
    activeCustomersCount,
    submittedOrdersCount,
    activeProductsCount,
    activePalletsCount,
    ordersResponse,
    customersResponse,
  ] = await Promise.all([
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
      .from('products')
      .select('*', { head: true, count: 'exact' })
      .eq('is_discontinued', false),
    context.supabase
      .from('pallet_deals')
      .select('*', { head: true, count: 'exact' })
      .eq('is_active', true),
    context.supabase
      .from('orders')
      .select('*')
      .order('delivery_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    context.supabase
      .from('profiles')
      .select('id,business_name,contact_name,email')
      .eq('role', 'customer')
      .order('business_name', { ascending: true }),
  ])

  if (ordersResponse.error) throw ordersResponse.error
  if (customersResponse.error) throw customersResponse.error

  const stats = [
    {
      label: 'Orders Today',
      value: ordersTodayCount.count ?? 0,
      href: `/admin/dashboard?deliveryDate=${today}`,
    },
    {
      label: 'Pending Review',
      value: submittedOrdersCount.count ?? 0,
      href: '/admin/dashboard?status=submitted',
    },
    {
      label: 'Drafts',
      value: draftOrdersCount.count ?? 0,
      href: '/admin/dashboard?status=draft',
    },
    {
      label: 'Customers',
      value: activeCustomersCount.count ?? 0,
      href: '/admin/customers',
    },
    {
      label: 'Products',
      value: activeProductsCount.count ?? 0,
      href: '/admin/catalog',
    },
    {
      label: 'Pallets',
      value: activePalletsCount.count ?? 0,
      href: '/admin/catalog/pallets',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{formatDeliveryDate(today)}</p>
      </div>

      {/* Stat cards — 2 cols mobile, 3 cols desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
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

      {/* Full orders section */}
      <OrdersSection
        orders={ordersResponse.data ?? []}
        customers={customersResponse.data ?? []}
        basePath="/admin/dashboard"
      />
    </div>
  )
}
