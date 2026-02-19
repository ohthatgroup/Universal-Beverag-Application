import { OrdersList } from '@/components/orders/orders-list'
import type { Order } from '@/lib/types'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayISODate } from '@/lib/utils'

export default async function PortalOrdersPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { customerId, profile } = await resolveCustomerToken(token)

  const admin = createAdminClient()
  const today = todayISODate()

  const { data: orders, error } = await admin
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('delivery_date', { ascending: false })

  if (error) {
    throw error
  }

  const currentOrders: Order[] = []
  const pastOrders: Order[] = []

  for (const order of (orders ?? []) as Order[]) {
    if (order.status === 'draft' || order.delivery_date >= today) {
      currentOrders.push(order)
    } else {
      pastOrders.push(order)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <OrdersList
        token={token}
        currentOrders={currentOrders}
        pastOrders={pastOrders}
        showPrices={profile.show_prices}
      />
    </div>
  )
}
