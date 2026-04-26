import { AnnouncementsManager } from '@/components/admin/announcements-manager'
import type { Announcement } from '@/components/portal/announcements-stack'
import type { PickerProduct } from '@/components/admin/product-picker'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { getProductPackLabel } from '@/lib/utils'

// TODO: replace with real db.query for announcements (see docs/handoff/homepage-redesign.md)
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    content_type: 'text',
    title: 'May Promotion',
    body: 'Free delivery on orders over $200.',
    cta_label: 'Learn more',
    cta_target_kind: 'url',
    cta_target_url: 'https://example.com/may-promo',
    cta_target_product_id: null,
    cta_target_product_ids: [],
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
    cta_target_kind: 'products',
    cta_target_url: null,
    cta_target_product_id: null,
    cta_target_product_ids: [],
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
    cta_target_kind: null,
    cta_target_url: null,
    cta_target_product_id: null,
    cta_target_product_ids: [],
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
    cta_target_kind: null,
    cta_target_url: null,
    cta_target_product_id: null,
    cta_target_product_ids: [],
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

  // Lightweight product list for the dialog's CTA destination + product
  // spotlight + specials grid pickers. Same filter as the order-builder
  // catalog query: discontinued excluded, customer-scoped products excluded
  // (we're admin so all customer-shared products are eligible).
  const db = await getRequestDb()
  const [productsResult, brandsResult] = await Promise.all([
    db.query<{
      id: string
      title: string
      brand_id: string | null
      pack_details: string | null
      pack_count: number | null
      size_value: number | null
      size_uom: string | null
      price: number
      image_url: string | null
    }>(
      `select id, title, brand_id, pack_details, pack_count, size_value, size_uom, price, image_url
         from products
        where is_discontinued = false
          and customer_id is null
        order by sort_order asc
        limit 1000`,
    ),
    db.query<{ id: string; name: string }>(
      `select id, name from brands order by sort_order asc`,
    ),
  ])
  const brandById = new Map(brandsResult.rows.map((b) => [b.id, b.name]))
  const pickerProducts: PickerProduct[] = productsResult.rows.map((p) => ({
    id: p.id,
    title: p.title,
    brandName: p.brand_id ? brandById.get(p.brand_id) ?? null : null,
    packLabel: getProductPackLabel(p),
    price: Number(p.price),
    imageUrl: p.image_url,
  }))

  return (
    <div className="space-y-2">
      <PageHeader
        title="Announcements"
        description="Curated content shown on the customer homepage."
      />
      <AnnouncementsManager
        initialAnnouncements={MOCK_ANNOUNCEMENTS}
        pickerProducts={pickerProducts}
      />
    </div>
  )
}
