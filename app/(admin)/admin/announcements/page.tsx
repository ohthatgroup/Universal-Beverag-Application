import { AnnouncementsManager } from '@/components/admin/announcements-manager'
import type { Announcement } from '@/components/portal/announcements-stack'
import { PageHeader } from '@/components/ui/page-header'
import { requirePageAuth } from '@/lib/server/page-auth'

// TODO: replace with real db.query for announcements (see docs/handoff/homepage-redesign.md)
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    content_type: 'text',
    title: 'May Promotion',
    body: 'Free delivery on orders over $200.',
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
    title: 'Summer Launch 2026',
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
    content_type: 'product',
    title: 'Cherry Coke 24/12oz',
    body: null,
    cta_label: null,
    cta_url: null,
    image_url: null,
    product_id: 'mock-product-id',
    product_ids: [],
    badge_overrides: {},
    audience_tags: [],
    starts_at: null,
    ends_at: null,
    is_active: false,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    content_type: 'specials_grid',
    title: 'Specials this week',
    body: null,
    cta_label: null,
    cta_url: null,
    image_url: null,
    product_id: null,
    product_ids: [],
    badge_overrides: {},
    audience_tags: ['wholesale'],
    starts_at: '2026-05-01',
    ends_at: '2026-05-15',
    is_active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export default async function AnnouncementsPage() {
  await requirePageAuth(['salesman'])

  return (
    <div className="space-y-2">
      <PageHeader
        title="Announcements"
        description="Curated content shown on the customer homepage."
      />
      <AnnouncementsManager initialAnnouncements={MOCK_ANNOUNCEMENTS} />
    </div>
  )
}
