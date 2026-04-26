// Shared mock announcement data so the customer-portal homepage,
// admin announcements page, and the new /portal/[token]/promo/[id]
// route all resolve from the same source. The real implementation will
// be a DB query (handoff entry 1); deleting this file is one of the
// last steps of that backend pass.

import type { Announcement } from '@/components/portal/announcements-stack'
import type { DbFacade } from '@/lib/server/db'

const NOW = new Date().toISOString()

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    content_type: 'text',
    title: 'May Promotion',
    body: 'Free delivery on all orders over $200 this month. No code needed.',
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
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: '2',
    content_type: 'image',
    title: 'Summer Launch',
    body: null,
    cta_label: 'Shop now',
    // Mock: deep-link target is a product list (set during compose).
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
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: '3',
    content_type: 'image_text',
    title: 'New seasonal lineup',
    body: 'Our spring delivery just landed. Browse the new flavors and sizes added to your catalog this week.',
    cta_label: 'See what’s new',
    cta_target_kind: 'products',
    cta_target_url: null,
    cta_target_product_id: null,
    cta_target_product_ids: [],
    image_url: 'https://placehold.co/600x600',
    product_id: null,
    product_ids: [],
    badge_overrides: {},
    audience_tags: [],
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 2,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: '4',
    content_type: 'product',
    title: null,
    body: 'Hand-picked by your salesman this week.',
    cta_label: 'Add to order',
    // Product spotlight — destination is the product itself; no extra cta target.
    cta_target_kind: null,
    cta_target_url: null,
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
    sort_order: 3,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: '5',
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
    audience_tags: [],
    starts_at: null,
    ends_at: null,
    is_active: true,
    sort_order: 4,
    created_at: NOW,
    updated_at: NOW,
  },
]

export function getMockAnnouncementById(id: string): Announcement | null {
  return MOCK_ANNOUNCEMENTS.find((a) => a.id === id) ?? null
}

/**
 * Given an announcement, return the product IDs that the /promo route
 * should display. Order:
 *   1. cta_target_kind=='product' → [cta_target_product_id]
 *   2. cta_target_kind=='products' → cta_target_product_ids
 *   3. content_type=='product' → [product_id]
 *   4. content_type=='specials_grid' → product_ids
 */
export function resolvePromoProductIds(a: Announcement): string[] {
  if (a.cta_target_kind === 'product' && a.cta_target_product_id) {
    return [a.cta_target_product_id]
  }
  if (a.cta_target_kind === 'products') {
    return a.cta_target_product_ids
  }
  if (a.content_type === 'product' && a.product_id) {
    return [a.product_id]
  }
  if (a.content_type === 'specials_grid') {
    return a.product_ids
  }
  return []
}

/**
 * Hydrate the mocks with real product IDs from the DB so deep-links
 * (and the /promo route) actually have something to render. Picks the
 * first N catalog products and seeds them into the announcements that
 * need products.
 *
 * This is a mock-mode shim — real announcements will store real product
 * UUIDs from the start, so this hydration step disappears with the
 * backend pass.
 */
export async function getHydratedMockAnnouncements(
  db: DbFacade,
): Promise<Announcement[]> {
  const { rows } = await db.query<{ id: string }>(
    `select id from products
       where is_discontinued = false
         and customer_id is null
       order by sort_order asc
       limit 6`,
  )
  const ids = rows.map((r) => r.id)
  return MOCK_ANNOUNCEMENTS.map((a) => {
    if (a.id === '2' || a.id === '3') {
      // Image / Image+Text — populate cta_target_product_ids
      return { ...a, cta_target_product_ids: ids.slice(0, 5) }
    }
    if (a.id === '4') {
      // Product spotlight — single product
      return { ...a, product_id: ids[0] ?? null }
    }
    if (a.id === '5') {
      // Specials grid — multiple products
      return { ...a, product_ids: ids.slice(0, 4) }
    }
    return a
  })
}
