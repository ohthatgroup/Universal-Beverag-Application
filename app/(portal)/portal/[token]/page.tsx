import { OrdersList } from '@/components/orders/orders-list'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { StartOrderHero } from '@/components/portal/start-order-hero'
import { DraftResumeStrip } from '@/components/portal/draft-resume-strip'
import { PastOrdersSection } from '@/components/portal/past-orders-section'
import { AccountStatsCard } from '@/components/portal/account-stats-card'
import {
  AnnouncementsStack,
  type Announcement,
} from '@/components/portal/announcements-stack'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { todayISODate } from '@/lib/utils'
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

  const draftsForStrip = draftsResult.rows.map((order) => ({
    orderId: order.id,
    deliveryDate: order.delivery_date,
    itemCount: order.item_count ?? 0,
  }))

  const nonDraftCurrentOrders = currentOrders.filter((order) => order.status !== 'draft')

  const greetingName = (profile.business_name ?? '').trim() || (profile.contact_name ?? '').trim()

  return (
    <div className="space-y-8">
      {greetingName ? <PortalPageHeader title={greetingName} /> : null}

      <StartOrderHero token={token} initialDate={nextDeliveryDate} />

      <DraftResumeStrip token={token} drafts={draftsForStrip} />

      {/* TODO: replace with real account stats query */}
      <AccountStatsCard
        casesThisMonth={MOCK_STATS.casesThisMonth}
        spendThisMonth={MOCK_STATS.spendThisMonth}
        ordersThisMonth={MOCK_STATS.ordersThisMonth}
      />

      {/* TODO: replace with real announcements query */}
      <AnnouncementsStack
        announcements={MOCK_ANNOUNCEMENTS}
        token={token}
        primaryDraftOrderId={draftsResult.rows[0]?.id ?? null}
        showPrices={profile.show_prices}
      />

      {nonDraftCurrentOrders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-h3 text-muted-foreground">Upcoming & recent</h2>
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
    </div>
  )
}
