import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { OrdersSection } from '@/components/admin/orders-section'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatDeliveryDate, todayISODate } from '@/lib/utils'

export default async function DashboardPage() {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
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
    db.query<{ count: string }>('select count(*)::text as count from orders where delivery_date = $1', [today]),
    db.query<{ count: string }>("select count(*)::text as count from orders where status = 'draft'"),
    db.query<{ count: string }>("select count(*)::text as count from profiles where role = 'customer'"),
    db.query<{ count: string }>("select count(*)::text as count from orders where status = 'submitted'"),
    db.query<{ count: string }>(
      'select count(*)::text as count from products where customer_id is null and is_discontinued = false'
    ),
    db.query<{ count: string }>("select count(*)::text as count from pallet_deals where is_active = true"),
    db.query<{
      id: string
      customer_id: string | null
      delivery_date: string
      item_count: number | null
      total: number | null
      status: string
      created_at: string
    }>(
      `select id, customer_id, delivery_date::text, item_count, total, status, created_at::text
       from orders
       order by delivery_date desc, created_at desc
       limit 200`
    ),
    db.query<{
      id: string
      business_name: string | null
      contact_name: string | null
      email: string | null
      access_token: string | null
    }>(
      `select id, business_name, contact_name, email, access_token
       from profiles
       where role = 'customer'
       order by business_name asc nulls last, contact_name asc nulls last`
    ),
  ])

  const stats = [
    {
      label: 'Orders Today',
      value: Number(ordersTodayCount.rows[0]?.count ?? 0),
      href: `/admin/dashboard?deliveryDate=${today}`,
    },
    {
      label: 'Pending Review',
      value: Number(submittedOrdersCount.rows[0]?.count ?? 0),
      href: '/admin/dashboard?status=submitted',
    },
    {
      label: 'Drafts',
      value: Number(draftOrdersCount.rows[0]?.count ?? 0),
      href: '/admin/dashboard?status=draft',
    },
    {
      label: 'Customers',
      value: Number(activeCustomersCount.rows[0]?.count ?? 0),
      href: '/admin/customers',
    },
    {
      label: 'Products',
      value: Number(activeProductsCount.rows[0]?.count ?? 0),
      href: '/admin/catalog',
    },
    {
      label: 'Pallets',
      value: Number(activePalletsCount.rows[0]?.count ?? 0),
      href: '/admin/catalog/pallets',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{formatDeliveryDate(today)}</p>
      </div>

      {/* Stat cards - 2 cols mobile, 3 cols desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-left">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className="text-2xl font-semibold leading-tight">{stat.value}</div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Open</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <OrdersSection
        orders={ordersResponse.rows}
        customers={customersResponse.rows}
        basePath="/admin/dashboard"
      />
    </div>
  )
}
