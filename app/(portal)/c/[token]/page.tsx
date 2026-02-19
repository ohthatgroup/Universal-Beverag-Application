import { DateSelectorCard } from '@/components/orders/date-selector-card'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayISODate } from '@/lib/utils'

export default async function PortalHome({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { customerId } = await resolveCustomerToken(token)

  const admin = createAdminClient()

  const { data: drafts } = await admin
    .from('orders')
    .select('id,delivery_date,item_count,updated_at')
    .eq('customer_id', customerId)
    .eq('status', 'draft')
    .gte('delivery_date', todayISODate())
    .order('delivery_date', { ascending: true })
    .limit(5)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h1 className="mb-8 text-3xl font-semibold">Universal Beverages</h1>
      <DateSelectorCard
        token={token}
        drafts={(drafts ?? []).map((order) => ({
          deliveryDate: order.delivery_date,
          itemCount: order.item_count ?? 0,
        }))}
      />
    </div>
  )
}
