import { addDays, todayISODate } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { Money } from '@/components/ui/money'
import { StatusChip } from '@/components/ui/status-chip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import type { OrderStatus } from '@/lib/types'

interface ReportsPageProps {
  searchParams?: Promise<{
    from?: string
    to?: string
  }>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const from = resolvedSearchParams?.from ?? addDays(todayISODate(), -30)
  const to = resolvedSearchParams?.to ?? todayISODate()

  const { rows: orderRows } = await db.query<{
    id: string
    status: string
    total: number | null
    item_count: number | null
    delivery_date: string
  }>(
    `select id, status, total, item_count, delivery_date::text
     from orders
     where delivery_date >= $1 and delivery_date <= $2`,
    [from, to]
  )
  const orderIds = orderRows.map((order) => order.id).filter((id): id is string => Boolean(id))

  const [orderItemsResponse, productsResponse, brandsResponse] = await Promise.all([
    orderIds.length
      ? db.query<{
          order_id: string
          product_id: string | null
          pallet_deal_id: string | null
          quantity: number
          line_total: number | null
        }>(
          `select order_id, product_id, pallet_deal_id, quantity, line_total
           from order_items
           where order_id = any($1::uuid[])`,
          [orderIds]
        )
      : Promise.resolve({ rows: [] }),
    db.query<{ id: string; title: string; brand_id: string | null }>('select id, title, brand_id from products'),
    db.query<{ id: string; name: string }>('select id, name from brands'),
  ])

  const productsById = new Map(productsResponse.rows.map((product) => [product.id, product]))
  const brandsById = new Map(brandsResponse.rows.map((brand) => [brand.id, brand]))

  const revenue = orderRows.reduce((sum, order) => sum + Number(order.total ?? 0), 0)
  const itemsSold = orderRows.reduce((sum, order) => sum + Number(order.item_count ?? 0), 0)

  const productTotals = new Map<string, { title: string; quantity: number; revenue: number; brandName: string | null }>()
  for (const item of orderItemsResponse.rows) {
    if (!item.product_id) continue
    const product = productsById.get(item.product_id)
    const brand = product?.brand_id ? brandsById.get(product.brand_id) : null
    const existing = productTotals.get(item.product_id)
    const nextValue = {
      title: product?.title ?? 'Unknown product',
      quantity: (existing?.quantity ?? 0) + Number(item.quantity ?? 0),
      revenue: (existing?.revenue ?? 0) + Number(item.line_total ?? 0),
      brandName: brand?.name ?? null,
    }
    productTotals.set(item.product_id, nextValue)
  }

  const topProducts = [...productTotals.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" description="Revenue and order trends for the selected date range." />

      <form className="grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full md:w-auto">
            Run Report
          </Button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Orders</div>
          <div className="mt-2 text-3xl font-semibold">{orderRows.length}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Revenue</div>
          <div className="mt-2 text-3xl"><Money value={revenue} /></div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Items Sold</div>
          <div className="mt-2 text-3xl font-semibold">{itemsSold}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-medium">Orders</h2>
          <Separator className="my-4" />
          <div className="space-y-3">
            {orderRows.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <div className="font-medium">{order.delivery_date}</div>
                  <StatusChip status={order.status as OrderStatus} className="mt-1" />
                </div>
                <div className="text-right">
                  <Money value={Number(order.total ?? 0)} />
                  <div className="text-sm text-muted-foreground">{order.item_count ?? 0} items</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-medium">Top Products</h2>
          <Separator className="my-4" />
          <div className="space-y-3">
            {topProducts.map(([productId, row]) => (
              <div key={productId} className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <div className="font-medium">{row.title}</div>
                  <div className="text-sm text-muted-foreground">{row.brandName ?? 'Unassigned brand'}</div>
                </div>
                <div className="text-right">
                  <Money value={row.revenue} />
                  <div className="text-sm text-muted-foreground">{row.quantity} sold</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
