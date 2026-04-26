import { OrdersList } from '@/components/orders/orders-list'
import { HomepageGreeting } from '@/components/portal/homepage-greeting'
import { StartOrderFork } from '@/components/portal/start-order-fork'
import { PastOrdersSection } from '@/components/portal/past-orders-section'
import { AccountStatsCard } from '@/components/portal/account-stats-card'
import {
  AnnouncementsStack,
  type Announcement,
} from '@/components/portal/announcements-stack'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { addDays, todayISODate } from '@/lib/utils'
import type { Order } from '@/lib/types'

// TODO: replace with real data from announcements query (see docs/handoff/homepage-redesign.md)
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    content_type: 'text',
    title: 'May Promotion',
    body: 'Free delivery on all orders over $200 this month. No code needed.',
    cta_label: 'Learn more',
    cta_url: '#',
    image_url: null,
    product_id: null,
    product_ids: [],
    badge_overrides: {},
    audience_tags: [],
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    content_type: 'image',
    title: 'Summer Launch',
    body: null,
    cta_label: 'Shop now',
    cta_url: '#',
    image_url: 'https://placehold.co/1200x525',
    product_id: null,
    product_ids: [],
    badge_overrides: {},
    audience_tags: [],
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    content_type: 'image_text',
    title: 'New seasonal lineup',
    body: 'Our spring delivery just landed. Browse the new flavors and sizes added to your catalog this week.',
    cta_label: 'See what’s new',
    cta_url: '#',
    image_url: 'https://placehold.co/600x600',
    product_id: null,
    product_ids: [],
    badge_overrides: {},
    audience_tags: [],
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    content_type: 'product',
    title: null,
    body: 'Hand-picked by your salesman this week.',
    cta_label: 'Add to order',
    cta_url: null,
    image_url: null,
    product_id: 'mock-product-id',
    product_ids: [],
    badge_overrides: {},
    audience_tags: [],
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    content_type: 'specials_grid',
    title: 'Specials this week',
    body: null,
    cta_label: null,
    cta_url: null,
    image_url: null,
    product_id: null,
    product_ids: [],
    badge_overrides: {},
    audience_tags: [],
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// TODO: replace with real account stats query (see docs/handoff/homepage-redesign.md)
const MOCK_STATS = {
  casesThisMonth: 48,
  spendThisMonth: 1240,
  ordersThisMonth: 3,
}

export default async function PortalHome({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { customerId, profile } = await resolveCustomerToken(token)
  const db = await getRequestDb()
  const today = todayISODate()

  const [draftsResult, ordersResult] = await Promise.all([
    db.query<{
      id: string
      delivery_date: string
      item_count: number | null
      updated_at: string
    }>(
      `select id, delivery_date::text, item_count, updated_at::text
       from orders
       where customer_id = $1
         and status = 'draft'
         and delivery_date >= $2
       order by delivery_date asc
       limit 5`,
      [customerId, today]
    ),
    db.query<{
      id: string
      customer_id: string
      delivery_date: string
      status: 'draft' | 'submitted' | 'delivered'
      total: number | null
      item_count: number | null
      submitted_at: string | null
      delivered_at: string | null
      created_at: string
      updated_at: string
    }>(
      `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text
       from orders
       where customer_id = $1
       order by delivery_date desc`,
      [customerId]
    ),
  ])

  const currentOrders: Order[] = []
  const pastOrders: Order[] = []

  for (const order of ordersResult.rows) {
    const normalized: Order = {
      ...order,
      total: Number(order.total ?? 0),
      item_count: order.item_count ?? 0,
    }

    if (normalized.status === 'draft' || normalized.delivery_date >= today) {
      currentOrders.push(normalized)
    } else {
      pastOrders.push(normalized)
    }
  }

  const nextDeliveryDate = draftsResult.rows[0]?.delivery_date ?? today
  // TODO: replace with cutoff-aware next-next-date utility (see docs/handoff/homepage-redesign.md)
  const nextNextDeliveryDate = addDays(nextDeliveryDate, 7)

  const primaryDraftRow = draftsResult.rows[0] ?? null
  const primaryDraft = primaryDraftRow
    ? {
        id: primaryDraftRow.id,
        deliveryDate: primaryDraftRow.delivery_date,
        itemCount: primaryDraftRow.item_count ?? 0,
        updatedAt: primaryDraftRow.updated_at,
      }
    : null

  const submittedOrders = ordersResult.rows.filter(
    (o) => o.status === 'submitted' || o.status === 'delivered',
  )
  const submittedOrderCount = submittedOrders.length
  // ordersResult is already ordered delivery_date desc, so newest first.
  const recentOrders = submittedOrders.slice(0, 5).map((row) => ({
    id: row.id,
    deliveryDate: row.delivery_date,
    itemCount: row.item_count ?? 0,
    total: Number(row.total ?? 0),
    status: row.status as 'submitted' | 'delivered',
  }))

  const nonDraftCurrentOrders = currentOrders.filter((order) => order.status !== 'draft')

  return (
    <div className="-mx-4 md:-mx-6">
      {/* Above the fold — welcome moment + start-order surface, on the page background. */}
      <div className="mx-auto w-full max-w-[600px] space-y-6 px-4 pb-8 md:px-6">
        <HomepageGreeting
          contactName={profile.contact_name}
          businessName={profile.business_name}
        />

        <StartOrderFork
          token={token}
          nextDeliveryDate={nextDeliveryDate}
          nextNextDeliveryDate={nextNextDeliveryDate}
          primaryDraft={primaryDraft}
          submittedOrderCount={submittedOrderCount}
          recentOrders={recentOrders}
        />
      </div>

      {/* Below the fold — curated content + history + reference data, on a
          subtly tinted surface. The tone shift signals a different zone:
          the salesman side of the page. */}
      <div className="border-t border-foreground/5 bg-muted/30">
        <div className="mx-auto w-full max-w-[600px] space-y-8 px-4 py-8 md:px-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              For you
            </h2>
            {/* TODO: replace with real announcements query */}
            <AnnouncementsStack
              announcements={MOCK_ANNOUNCEMENTS}
              token={token}
              primaryDraftOrderId={primaryDraftRow?.id ?? null}
              showPrices={profile.show_prices}
            />
          </section>

          {nonDraftCurrentOrders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Recent orders
              </h2>
              <OrdersList
                token={token}
                orders={nonDraftCurrentOrders}
                variant="current"
                showPrices={profile.show_prices}
              />
            </section>
          )}

          <PastOrdersSection
            token={token}
            orders={pastOrders}
            showPrices={profile.show_prices}
          />

          {/* TODO: replace with real account stats query */}
          <AccountStatsCard
            casesThisMonth={MOCK_STATS.casesThisMonth}
            spendThisMonth={MOCK_STATS.spendThisMonth}
            ordersThisMonth={MOCK_STATS.ordersThisMonth}
          />
        </div>
      </div>
    </div>
  )
}
