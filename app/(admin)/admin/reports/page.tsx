import { addDays, formatCurrency, todayISODate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requirePageAuth } from '@/lib/server/page-auth'

interface ReportsPageProps {
  searchParams?: {
    from?: string
    to?: string
  }
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const context = await requirePageAuth(['salesman'])

  const from = searchParams?.from ?? addDays(todayISODate(), -30)
  const to = searchParams?.to ?? todayISODate()

  const { data: orders, error: ordersError } = await context.supabase
    .from('orders')
    .select('id,status,total,item_count,delivery_date')
    .gte('delivery_date', from)
    .lte('delivery_date', to)

  if (ordersError) throw ordersError

  const orderIds = ((orders ?? []) as any[]).map((order) => order.id)

  const [orderItemsResponse, productsResponse, brandsResponse] = await Promise.all([
    orderIds.length
      ? context.supabase
          .from('order_items')
          .select('order_id,product_id,pallet_deal_id,quantity,line_total')
          .in('order_id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    context.supabase.from('products').select('id,title,brand_id'),
    context.supabase.from('brands').select('id,name'),
  ])

  if (orderItemsResponse.error) throw orderItemsResponse.error
  if (productsResponse.error) throw productsResponse.error
  if (brandsResponse.error) throw brandsResponse.error

  const totalRevenue = ((orders ?? []) as any[]).reduce((sum, order) => sum + Number(order.total), 0)
  const totalItems = ((orders ?? []) as any[]).reduce((sum, order) => sum + Number(order.item_count), 0)

  const statusCounts = {
    draft: ((orders ?? []) as any[]).filter((order) => order.status === 'draft').length,
    submitted: ((orders ?? []) as any[]).filter((order) => order.status === 'submitted').length,
    delivered: ((orders ?? []) as any[]).filter((order) => order.status === 'delivered').length,
  }

  const productById = new Map<string, any>(
    ((productsResponse.data ?? []) as any[]).map((product) => [product.id, product])
  )
  const brandById = new Map<string, string>(
    ((brandsResponse.data ?? []) as any[]).map((brand) => [brand.id, brand.name])
  )

  const revenueByBrand = new Map<string, number>()

  for (const item of (orderItemsResponse.data ?? []) as any[]) {
    if (!item.product_id) continue
    const product = productById.get(item.product_id)
    const brandLabel = product?.brand_id ? brandById.get(product.brand_id) ?? 'Unbranded' : 'Unbranded'
    revenueByBrand.set(brandLabel, (revenueByBrand.get(brandLabel) ?? 0) + Number(item.line_total))
  }

  const topBrands = Array.from(revenueByBrand.entries())
    .map(([brand, revenue]) => ({ brand, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return (
    <div className="space-y-4 p-4 pb-20">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-2 gap-2" method="GET">
            <label className="text-sm">
              From
              <input
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                name="from"
                type="date"
                defaultValue={from}
              />
            </label>
            <label className="text-sm">
              To
              <input
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                name="to"
                type="date"
                defaultValue={to}
              />
            </label>
            <button className="col-span-2 h-10 rounded-md bg-primary text-sm font-medium text-primary-foreground" type="submit">
              Refresh Report
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="space-y-1 p-3">
            <div className="text-xs text-muted-foreground">Orders</div>
            <div className="text-xl font-semibold">{orders?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-3">
            <div className="text-xs text-muted-foreground">Revenue</div>
            <div className="text-xl font-semibold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-3">
            <div className="text-xs text-muted-foreground">Item Count</div>
            <div className="text-xl font-semibold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-3">
            <div className="text-xs text-muted-foreground">Delivered</div>
            <div className="text-xl font-semibold">{statusCounts.delivered}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>Draft: {statusCounts.draft}</div>
          <div>Submitted: {statusCounts.submitted}</div>
          <div>Delivered: {statusCounts.delivered}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Brands by Revenue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topBrands.map((entry) => (
            <div key={entry.brand} className="flex items-center justify-between text-sm">
              <span>{entry.brand}</span>
              <span>{formatCurrency(entry.revenue)}</span>
            </div>
          ))}
          {topBrands.length === 0 && <p className="text-sm text-muted-foreground">No brand data available.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
