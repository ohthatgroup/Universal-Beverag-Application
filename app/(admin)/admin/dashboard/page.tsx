import { AdminHome, type HomeOrderRow, type HomeCustomerRow, type HomeProductRow, type HomeBrandRow } from '@/components/admin/admin-home'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { addDays, todayISODate } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

export default async function DashboardPage() {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const trailingFrom = addDays(todayISODate(), -30)
  const trailingTo = todayISODate()

  const [
    ordersResponse,
    customersResponse,
    productsResponse,
    brandsResponse,
    trailingOrderRowsResponse,
  ] = await Promise.all([
    db.query<{
      id: string
      customer_id: string | null
      delivery_date: string
      item_count: number | null
      total: number | null
      status: string
      created_at: string
    }>(
      `select id, customer_id, delivery_date::text, item_count, total, status, created_at::text
       from orders
       order by delivery_date desc, created_at desc
       limit 200`
    ),
    db.query<{
      id: string
      business_name: string | null
      contact_name: string | null
      email: string | null
      last_order_date: string | null
    }>(
      `select
          p.id,
          p.business_name,
          p.contact_name,
          p.email,
          max(o.delivery_date)::text as last_order_date
        from profiles p
        left join orders o on o.customer_id = p.id
        where p.role = 'customer'
        group by p.id, p.business_name, p.contact_name, p.email
        order by p.business_name asc nulls last, p.contact_name asc nulls last, p.id asc`
    ),
    db.query<{ id: string; title: string; brand_id: string | null }>(
      `select id, title, brand_id from products where customer_id is null and is_discontinued = false`
    ),
    db.query<{ id: string; name: string }>('select id, name from brands order by name asc'),
    db.query<{ id: string }>(
      `select id from orders where delivery_date >= $1 and delivery_date <= $2`,
      [trailingFrom, trailingTo]
    ),
  ])

  const customerNameById = new Map<string, string>()
  for (const c of customersResponse.rows) {
    customerNameById.set(
      c.id,
      c.business_name ?? c.contact_name ?? c.email ?? 'Unnamed customer'
    )
  }

  const brandsById = new Map(brandsResponse.rows.map((b) => [b.id, b]))

  const allOrders: HomeOrderRow[] = ordersResponse.rows.map((o) => ({
    id: o.id,
    customerName: o.customer_id
      ? customerNameById.get(o.customer_id) ?? 'Unknown customer'
      : 'Unknown customer',
    deliveryDate: o.delivery_date,
    status: (o.status as OrderStatus) ?? 'draft',
    itemCount: Number(o.item_count ?? 0),
    total: Number(o.total ?? 0),
  }))

  const allCustomers: HomeCustomerRow[] = customersResponse.rows.map((c) => ({
    id: c.id,
    businessName: c.business_name ?? c.contact_name ?? 'Unnamed customer',
    email: c.email,
    lastOrderDate: c.last_order_date,
  }))

  const allProducts: HomeProductRow[] = productsResponse.rows.map((p) => ({
    id: p.id,
    title: p.title,
    brandName: p.brand_id ? brandsById.get(p.brand_id)?.name ?? null : null,
  }))

  const allBrands: HomeBrandRow[] = brandsResponse.rows.map((b) => ({
    id: b.id,
    name: b.name,
  }))

  const recentOrders = allOrders.slice(0, 5)

  const recentCustomers: HomeCustomerRow[] = [...allCustomers]
    .filter((c) => c.lastOrderDate)
    .sort((a, b) => (a.lastOrderDate! < b.lastOrderDate! ? 1 : -1))
    .slice(0, 5)

  const trailingOrderIds = trailingOrderRowsResponse.rows.map((r) => r.id)
  let topProducts: HomeProductRow[] = []
  if (trailingOrderIds.length > 0) {
    const { rows: trailingItems } = await db.query<{
      product_id: string | null
      quantity: number
      line_total: number | null
    }>(
      `select product_id, quantity, line_total
       from order_items
       where order_id = any($1::uuid[])`,
      [trailingOrderIds]
    )

    const productsById = new Map(
      productsResponse.rows.map((p) => [p.id, p])
    )

    const totals = new Map<
      string,
      { revenue: number; quantity: number }
    >()
    for (const item of trailingItems) {
      if (!item.product_id) continue
      const existing = totals.get(item.product_id)
      totals.set(item.product_id, {
        revenue: (existing?.revenue ?? 0) + Number(item.line_total ?? 0),
        quantity: (existing?.quantity ?? 0) + Number(item.quantity ?? 0),
      })
    }

    topProducts = [...totals.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([productId, totalsRow]) => {
        const product = productsById.get(productId)
        const brand = product?.brand_id ? brandsById.get(product.brand_id) : null
        return {
          id: productId,
          title: product?.title ?? 'Unknown product',
          brandName: brand?.name ?? null,
          revenue: totalsRow.revenue,
          quantity: totalsRow.quantity,
        }
      })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" />
      <AdminHome
        recentOrders={recentOrders}
        recentCustomers={recentCustomers}
        topProducts={topProducts}
        allOrders={allOrders}
        allCustomers={allCustomers}
        allProducts={allProducts}
        allBrands={allBrands}
      />
    </div>
  )
}
