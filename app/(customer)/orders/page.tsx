import { OrdersList } from '@/components/orders/orders-list'
import type { Order } from '@/lib/types'
import { requirePageAuth } from '@/lib/server/page-auth'
import { todayISODate } from '@/lib/utils'

export default async function CustomerOrdersPage() {
  const context = await requirePageAuth(['customer'])
  const today = todayISODate()

  const { data: orders, error } = await context.supabase
    .from('orders')
    .select('*')
    .eq('customer_id', context.userId)
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
        currentOrders={currentOrders}
        pastOrders={pastOrders}
        showPrices={context.profile.show_prices}
      />
    </div>
  )
}
