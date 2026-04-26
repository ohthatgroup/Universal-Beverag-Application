import type { Viewport } from 'next'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { getRequestDb } from '@/lib/server/db'
import { PortalTopBar } from '@/components/layout/portal-top-bar'
import { StartOrderDrawerProvider } from '@/components/portal/start-order-drawer-context'
import { FALLBACK_SALESMAN } from '@/lib/config/salesman'
import { addDays, todayISODate } from '@/lib/utils'
import type { RecentOrderForDrawer } from '@/components/portal/start-order-drawer'

// Lock zoom on the customer portal. Two reasons:
//   1. Prevents iOS Safari from auto-zooming when an input <16px gains
//      focus and refusing to zoom back out when the keyboard dismisses.
//   2. The portal's tap targets are already comfortably sized (Stepper
//      is h-8 minimum); customers don't need to pinch-zoom an order.
// Admin pages inherit the root viewport and keep pinch-zoom.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { customerId } = await resolveCustomerToken(token)
  const db = await getRequestDb()
  const today = todayISODate()

  // Fetch the navbar drawer's data alongside the token resolution so the
  // Start-order drawer is ready to open from any page in the portal.
  const [draftsResult, recentOrdersResult, usualsCountResult, salesmanResult] =
    await Promise.all([
      db.query<{ id: string; delivery_date: string; item_count: number | null }>(
        `select id, delivery_date::text, item_count
         from orders
         where customer_id = $1
           and status = 'draft'
           and delivery_date >= $2
         order by delivery_date asc
         limit 1`,
        [customerId, today]
      ),
      db.query<{
        id: string
        delivery_date: string
        item_count: number | null
        total: number | null
        status: 'submitted' | 'delivered'
      }>(
        `select id, delivery_date::text, item_count, total, status
         from orders
         where customer_id = $1
           and status in ('submitted', 'delivered')
         order by delivery_date desc
         limit 5`,
        [customerId]
      ),
      db.query<{ count: string }>(
        `select count(*)::text as count
           from customer_products cp
           join products p on p.id = cp.product_id
          where cp.customer_id = $1
            and cp.is_usual = true
            and cp.excluded = false
            and p.is_discontinued = false`,
        [customerId]
      ),
      db.query<{ contact_name: string | null; phone: string | null }>(
        `select p2.contact_name, p2.phone
           from profiles p2
          where p2.id = (select created_by from profiles where id = $1)`,
        [customerId]
      ),
    ])

  const usualsCount = Number(usualsCountResult.rows[0]?.count ?? 0)

  // Resolve the salesman who created this customer (W1's `profiles.created_by`).
  // When the link is null, or the salesman has no contact_name/phone,
  // fall back to a generic so the surface stays non-breaking. The Call
  // button in `<PortalTopBar>` hides itself when phone is null.
  const salesmanRow = salesmanResult.rows[0]
  const salesman = {
    name: salesmanRow?.contact_name ?? FALLBACK_SALESMAN.name,
    phone: salesmanRow?.phone ?? FALLBACK_SALESMAN.phone,
  }

  const primaryDraftRow = draftsResult.rows[0] ?? null
  const primaryDraft = primaryDraftRow
    ? {
        id: primaryDraftRow.id,
        deliveryDate: primaryDraftRow.delivery_date,
        itemCount: primaryDraftRow.item_count ?? 0,
      }
    : null

  const nextDeliveryDate = primaryDraft?.deliveryDate ?? today
  // TODO: cutoff-aware utility (see handoff entry 11).
  const nextNextDeliveryDate = addDays(nextDeliveryDate, 7)

  const recentOrders: RecentOrderForDrawer[] = recentOrdersResult.rows.map(
    (row) => ({
      id: row.id,
      deliveryDate: row.delivery_date,
      itemCount: row.item_count ?? 0,
      total: Number(row.total ?? 0),
      status: row.status,
    }),
  )

  return (
    <StartOrderDrawerProvider
      data={{
        token,
        nextDeliveryDate,
        nextNextDeliveryDate,
        primaryDraft,
        recentOrders,
        usualsCount,
      }}
    >
      <div className="min-h-screen bg-background">
        <PortalTopBar token={token} salesman={salesman} />
        <main>
          <div className="mx-auto max-w-3xl p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </StartOrderDrawerProvider>
  )
}
