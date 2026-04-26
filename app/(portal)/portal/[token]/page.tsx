import { HomepageWelcome } from '@/components/portal/homepage-welcome'
import { HomepageStartSection, type DraftForStrip } from '@/components/portal/homepage-start-section'
import { AccountStatsCard } from '@/components/portal/account-stats-card'
import {
  AnnouncementsStack,
  type Announcement,
} from '@/components/portal/announcements-stack'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { todayISODate } from '@/lib/utils'

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

  // Drafts only — order history moved to /portal/[token]/orders.
  const draftsResult = await db.query<{
    id: string
    delivery_date: string
    item_count: number | null
  }>(
    `select id, delivery_date::text, item_count
     from orders
     where customer_id = $1
       and status = 'draft'
       and delivery_date >= $2
     order by delivery_date asc
     limit 10`,
    [customerId, today],
  )

  const drafts: DraftForStrip[] = draftsResult.rows.map((row) => ({
    id: row.id,
    deliveryDate: row.delivery_date,
    itemCount: row.item_count ?? 0,
  }))

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-8">
      <section className="space-y-6 pt-2">
        <HomepageWelcome
          contactName={profile.contact_name}
          businessName={profile.business_name}
        />

        <HomepageStartSection token={token} drafts={drafts} />
      </section>

      <section className="space-y-8 rounded-2xl border border-foreground/5 bg-muted/30 px-4 py-6 md:px-6 md:py-8">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            For you
          </h2>
          {/* TODO: replace with real announcements query */}
          <AnnouncementsStack
            announcements={MOCK_ANNOUNCEMENTS}
            token={token}
            primaryDraftOrderId={drafts[0]?.id ?? null}
            showPrices={profile.show_prices}
          />
        </div>

        {/* TODO: replace with real account stats query */}
        <AccountStatsCard
          casesThisMonth={MOCK_STATS.casesThisMonth}
          spendThisMonth={MOCK_STATS.spendThisMonth}
          ordersThisMonth={MOCK_STATS.ordersThisMonth}
        />
      </section>
    </div>
  )
}
