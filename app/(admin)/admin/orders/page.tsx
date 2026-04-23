import { LiveQueryInput } from '@/components/admin/live-query-input'
import { OrdersTableManager } from '@/components/admin/orders-table-manager'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import type { OrderStatus } from '@/lib/types'

interface AdminOrdersPageProps {
  searchParams?: Promise<{
    q?: string
    status?: string
    deliveryDate?: string
  }>
}

function normalizeStatus(value: string | undefined | null): OrderStatus | 'all' {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') return value
  return 'all'
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolved = searchParams ? await searchParams : undefined
  const searchQuery = (resolved?.q ?? '').trim()
  const selectedStatus = normalizeStatus(resolved?.status)

  const [ordersResponse, customersResponse] = await Promise.all([
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

  const totalOrders = ordersResponse.rows.length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        description={`${totalOrders} order${totalOrders === 1 ? '' : 's'}`}
      />

      <OrdersTableManager
        orders={ordersResponse.rows}
        customers={customersResponse.rows}
        searchQuery={searchQuery}
        selectedStatus={selectedStatus}
        basePath="/admin/orders"
        search={
          <LiveQueryInput placeholder="Search orders by customer..." initialValue={searchQuery} />
        }
      />
    </div>
  )
}
