import { addDays, formatCurrency, getStatusIcon, todayISODate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      {/* Date range filter */}
      <form className="flex flex-wrap items-end gap-3" method="GET">
        <div className="space-y-1">
          <Label htmlFor="from" className="text-xs">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from} className="h-9 w-40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to" className="text-xs">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to} className="h-9 w-40" />
        </div>
        <Button type="submit" size="sm">Refresh</Button>
      </form>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-semibold">{orderRows.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Orders</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-semibold">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-muted-foreground mt-1">Revenue</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-semibold">{totalItems}</div>
          <div className="text-xs text-muted-foreground mt-1">Items Ordered</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-semibold">{statusCounts.delivered}</div>
          <div className="text-xs text-muted-foreground mt-1">Delivered</div>
        </div>
      </div>

      <Separator />

      {/* Status breakdown */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status Breakdown</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>{getStatusIcon('draft')} Draft: {statusCounts.draft}</span>
          <span>{getStatusIcon('submitted')} Submitted: {statusCounts.submitted}</span>
          <span>{getStatusIcon('delivered')} Delivered: {statusCounts.delivered}</span>
        </div>
      </section>

      <Separator />

      {/* Top brands */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Brands by Revenue</h2>

        {topBrands.length === 0 ? (
          <p className="text-sm text-muted-foreground">No brand data available.</p>
        ) : (
          <>
            {/* Mobile */}
            <div className="space-y-0 md:hidden">
              {topBrands.map((entry, index) => (
                <div key={entry.brand} className="flex items-center justify-between border-b py-2.5 last:border-0">
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                    {entry.brand}
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(entry.revenue)}</div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium w-12">#</th>
                    <th className="px-4 py-2 text-left font-medium">Brand</th>
                    <th className="px-4 py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topBrands.map((entry, index) => (
                    <tr key={entry.brand} className="border-b last:border-0">
                      <td className="px-4 py-2 text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">{entry.brand}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(entry.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
