import { DateSelectorCard } from '@/components/orders/date-selector-card'
import { OrdersList } from '@/components/orders/orders-list'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayISODate } from '@/lib/utils'
import type { Order } from '@/lib/types'

export default async function PortalHome({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { customerId, profile } = await resolveCustomerToken(token)

  const admin = createAdminClient()
  const today = todayISODate()

  // Fetch drafts (for date selector "continue" button) and all orders in parallel
  const [draftsResponse, ordersResponse] = await Promise.all([
    admin
      .from('orders')
      .select('id,delivery_date,item_count,updated_at')
      .eq('customer_id', customerId)
      .eq('status', 'draft')
      .gte('delivery_date', today)
      .order('delivery_date', { ascending: true })
      .limit(5),
    admin
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('delivery_date', { ascending: false }),
  ])

  if (ordersResponse.error) {
    throw ordersResponse.error
  }

  const currentOrders: Order[] = []
  const pastOrders: Order[] = []

  for (const order of (ordersResponse.data ?? []) as Order[]) {
    if (order.status === 'draft' || order.delivery_date >= today) {
      currentOrders.push(order)
    } else {
      pastOrders.push(order)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Universal Beverages</h1>

      <DateSelectorCard
        token={token}
        drafts={(draftsResponse.data ?? []).map((order) => ({
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
