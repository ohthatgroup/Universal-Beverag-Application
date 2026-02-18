import { addDays, formatCurrency, todayISODate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requirePageAuth } from '@/lib/server/page-auth'

interface ReportsPageProps {
  searchParams?: Promise<{
    from?: string
    to?: string
  }>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const context = await requirePageAuth(['salesman'])
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const from = resolvedSearchParams?.from ?? addDays(todayISODate(), -30)
  const to = resolvedSearchParams?.to ?? todayISODate()

  const { data: orders, error: ordersError } = await context.supabase
    .from('orders')
    .select('id,status,total,item_count,delivery_date')
    .gte('delivery_date', from)
    .lte('delivery_date', to)

  if (ordersError) throw ordersError

  const orderRows = orders ?? []
  const orderIds = orderRows.map((order) => order.id).filter((id): id is string => Boolean(id))

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

  const orderItemRows = orderItemsResponse.data ?? []
  const productRows = productsResponse.data ?? []
  const brandRows = brandsResponse.data ?? []

  const totalRevenue = orderRows.reduce((sum, order) => sum + Number(order.total ?? 0), 0)
  const totalItems = orderRows.reduce((sum, order) => sum + Number(order.item_count ?? 0), 0)

  const statusCounts = {
    draft: orderRows.filter((order) => order.status === 'draft').length,
    submitted: orderRows.filter((order) => order.status === 'submitted').length,
    delivered: orderRows.filter((order) => order.status === 'delivered').length,
  }

  const productById = new Map(productRows.map((product) => [product.id, product] as const))
  const brandById = new Map(brandRows.map((brand) => [brand.id, brand.name] as const))

  const revenueByBrand = new Map<string, number>()

  for (const item of orderItemRows) {
    if (!item.product_id) continue
    const product = productById.get(item.product_id)
    const brandLabel = product?.brand_id ? brandById.get(product.brand_id) ?? 'Unbranded' : 'Unbranded'
    revenueByBrand.set(brandLabel, (revenueByBrand.get(brandLabel) ?? 0) + Number(item.line_total ?? 0))
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
