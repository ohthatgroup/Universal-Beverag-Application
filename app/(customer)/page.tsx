import { DateSelectorCard } from '@/components/orders/date-selector-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatDeliveryDate, todayISODate } from '@/lib/utils'

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
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Welcome back</h1>

      <DateSelectorCard draftDates={(drafts ?? []).map((order) => order.delivery_date)} />

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Drafts</CardTitle>
        </CardHeader>
        <CardContent>
          {drafts && drafts.length > 0 ? (
            <ul className="space-y-3">
              {drafts.map((order) => (
                <li key={order.id} className="rounded-md border p-3">
                  <div className="text-sm font-medium">{formatDeliveryDate(order.delivery_date)}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.item_count ?? 0} items • Updated {order.updated_at ? new Date(order.updated_at).toLocaleString() : 'Unknown'}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming draft orders.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
