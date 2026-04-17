import { DateSelectorCard } from '@/components/orders/date-selector-card'
import { OrdersList } from '@/components/orders/orders-list'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { todayISODate } from '@/lib/utils'
import type { Order } from '@/lib/types'

export default async function PortalHome({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { customerId, profile } = await resolveCustomerToken(token)
  const db = await getRequestDb()
  const today = todayISODate()

  const [draftsResult, ordersResult] = await Promise.all([
    db.query<{
      id: string
      delivery_date: string
      item_count: number | null
      updated_at: string
    }>(
      `select id, delivery_date::text, item_count, updated_at::text
       from orders
       where customer_id = $1
         and status = 'draft'
         and delivery_date >= $2
       order by delivery_date asc
       limit 5`,
      [customerId, today]
    ),
    db.query<{
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
       order by delivery_date desc`,
      [customerId]
    ),
  ])

  const currentOrders: Order[] = []
  const pastOrders: Order[] = []

  for (const order of ordersResult.rows) {
    const normalized: Order = {
      ...order,
      total: Number(order.total ?? 0),
      item_count: order.item_count ?? 0,
    }

    if (normalized.status === 'draft' || normalized.delivery_date >= today) {
      currentOrders.push(normalized)
    } else {
      pastOrders.push(normalized)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Universal Beverages</h1>

      <DateSelectorCard
        token={token}
        drafts={draftsResult.rows.map((order) => ({
          deliveryDate: order.delivery_date,
          itemCount: order.item_count ?? 0,
        }))}
      />

      <OrdersList
        token={token}
        currentOrders={currentOrders}
        pastOrders={pastOrders}
        showPrices={profile.show_prices}
      />
    </div>
  )
}
