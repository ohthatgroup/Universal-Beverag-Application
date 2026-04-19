import { OrdersSection } from '@/components/admin/orders-section'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function DashboardPage() {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const [submittedOrdersCount, draftOrdersCount, ordersResponse, customersResponse] = await Promise.all([
    db.query<{ count: string }>("select count(*)::text as count from orders where status = 'submitted'"),
    db.query<{ count: string }>("select count(*)::text as count from orders where status = 'draft'"),
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
      access_token: string | null
    }>(
      `select id, business_name, contact_name, email, access_token
       from profiles
       where role = 'customer'
       order by business_name asc nulls last, contact_name asc nulls last`
    ),
  ])

  const submitted = Number(submittedOrdersCount.rows[0]?.count ?? 0)
  const drafts = Number(draftOrdersCount.rows[0]?.count ?? 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">
          {submitted} need review · {drafts} drafts
        </p>
      </div>

      <OrdersSection
        orders={ordersResponse.rows}
        customers={customersResponse.rows}
        basePath="/admin/dashboard"
      />
    </div>
  )
}
