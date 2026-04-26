import { OrderHistoryList } from '@/components/portal/order-history-list'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { OrderHistoryFilters } from '@/components/portal/order-history-filters'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { getRequestDb } from '@/lib/server/db'
import type { Order } from '@/lib/types'

interface OrdersPageProps {
  params: Promise<{ token: string }>
  searchParams?: Promise<{ status?: string }>
}

export default async function PortalOrdersPage({
  params,
  searchParams,
}: OrdersPageProps) {
  const { token } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const statusFilter = resolvedSearchParams?.status ?? 'all'

  const { customerId, profile } = await resolveCustomerToken(token)
  const db = await getRequestDb()

  const ordersResult = await db.query<{
    id: string
    customer_id: string
    delivery_date: string
    status: 'draft' | 'submitted' | 'delivered'
    total: number | null
    item_count: number | null
    submitted_at: string | null
    delivered_at: string | null
    created_at: string
    updated_at: string
  }>(
    `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text
     from orders
     where customer_id = $1
       and status in ('submitted', 'delivered')
     order by delivery_date desc`,
    [customerId]
  )

  const orders: Order[] = ordersResult.rows.map((row) => ({
    ...row,
    total: Number(row.total ?? 0),
    item_count: row.item_count ?? 0,
  }))

  const filtered =
    statusFilter === 'submitted'
      ? orders.filter((o) => o.status === 'submitted')
      : statusFilter === 'delivered'
        ? orders.filter((o) => o.status === 'delivered')
        : orders

  return (
    <div className="space-y-6">
      <PortalPageHeader
        back={{ href: `/portal/${token}` }}
        title="Order history"
        subtitle={
          orders.length === 0
            ? 'No orders yet'
            : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`
        }
      />

      <OrderHistoryFilters token={token} active={statusFilter} />

      <OrderHistoryList
        token={token}
        orders={filtered}
        showPrices={profile.show_prices}
      />
    </div>
  )
}
