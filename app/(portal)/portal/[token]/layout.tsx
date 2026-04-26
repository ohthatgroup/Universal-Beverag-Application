import type { Viewport } from 'next'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { getRequestDb } from '@/lib/server/db'
import { PortalTopBar } from '@/components/layout/portal-top-bar'
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

// TODO: replace with real customer_products usuals count.
// See docs/handoff/homepage-redesign.md entry 16.
const MOCK_USUALS_COUNT = 7

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
  const [draftsResult, recentOrdersResult] = await Promise.all([
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
  ])

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
    <div className="min-h-screen bg-background">
      <PortalTopBar
        token={token}
        nextDeliveryDate={nextDeliveryDate}
        nextNextDeliveryDate={nextNextDeliveryDate}
        primaryDraft={primaryDraft}
        recentOrders={recentOrders}
        usualsCount={MOCK_USUALS_COUNT}
      />
      <main>
        <div className="mx-auto max-w-3xl p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
