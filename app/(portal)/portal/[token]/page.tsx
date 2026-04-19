import { OrdersList } from '@/components/orders/orders-list'
import { PortalGreeting } from '@/components/portal/portal-greeting'
import { StartOrderHero } from '@/components/portal/start-order-hero'
import { DraftResumeStrip } from '@/components/portal/draft-resume-strip'
import { PastOrdersSection } from '@/components/portal/past-orders-section'
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

  const nextDeliveryDate = draftsResult.rows[0]?.delivery_date ?? today

  const draftsForStrip = draftsResult.rows.map((order) => ({
    orderId: order.id,
    deliveryDate: order.delivery_date,
    itemCount: order.item_count ?? 0,
  }))

  const nonDraftCurrentOrders = currentOrders.filter((order) => order.status !== 'draft')

  return (
    <div className="space-y-8">
      <PortalGreeting
        businessName={profile.business_name}
        contactName={profile.contact_name}
      />

      <StartOrderHero token={token} initialDate={nextDeliveryDate} />

      <DraftResumeStrip token={token} drafts={draftsForStrip} />

      {nonDraftCurrentOrders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-h3 text-muted-foreground">Upcoming & recent</h2>
          <OrdersList
            token={token}
            orders={nonDraftCurrentOrders}
            variant="current"
            showPrices={profile.show_prices}
          />
        </section>
      )}

      <PastOrdersSection
        token={token}
        orders={pastOrders}
        showPrices={profile.show_prices}
      />
    </div>
  )
}
