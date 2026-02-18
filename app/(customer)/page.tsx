import { DateSelectorCard } from '@/components/orders/date-selector-card'
import { requirePageAuth } from '@/lib/server/page-auth'
import { todayISODate } from '@/lib/utils'

export default async function CustomerHome() {
  const context = await requirePageAuth(['customer'])

  const { data: drafts } = await context.supabase
    .from('orders')
    .select('id,delivery_date,item_count,updated_at')
    .eq('customer_id', context.userId)
    .eq('status', 'draft')
    .gte('delivery_date', todayISODate())
    .order('delivery_date', { ascending: true })
    .limit(5)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h1 className="mb-8 text-3xl font-semibold">Universal Beverages</h1>
      <DateSelectorCard
        drafts={(drafts ?? []).map((order) => ({
          deliveryDate: order.delivery_date,
          itemCount: order.item_count ?? 0,
        }))}
      />
    </div>
  )
}
