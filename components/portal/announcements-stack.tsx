import { AnnouncementCard } from '@/components/portal/announcement-card'

export type AnnouncementContentType =
  | 'text'
  | 'image'
  | 'image_text'
  | 'product'
  | 'specials_grid'

/**
 * Where the announcement's CTA leads. Editorial cards (text / image /
 * image_text) pick one explicitly; product/specials_grid cards have an
 * implicit destination from their own `product_id` / `product_ids`.
 *
 *   'products' → opens /portal/[token]/promo/[id] with a curated grid
 *   'product'  → opens /portal/[token]/promo/[id] with a 1-product detail
 *   'url'      → opens an external https:// URL in a new tab
 */
export type CtaTargetKind = 'products' | 'product' | 'url'

export interface Announcement {
  id: string
  content_type: AnnouncementContentType
  title: string | null
  body: string | null
  image_url: string | null
  cta_label: string | null
  // CTA target — one of the three kinds, or null if no CTA action.
  cta_target_kind: CtaTargetKind | null
  cta_target_url: string | null              // when kind === 'url'
  cta_target_product_id: string | null       // when kind === 'product'
  cta_target_product_ids: string[]           // when kind === 'products'
  product_id: string | null
  product_ids: string[]
  badge_overrides: Record<string, string>
  audience_tags: string[]
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface AnnouncementsStackProps {
  announcements: Announcement[]
  token: string
  primaryDraftOrderId: string | null
  showPrices: boolean
}

export async function AnnouncementsStack({
  announcements,
  token,
  primaryDraftOrderId,
  showPrices,
}: AnnouncementsStackProps) {
  if (announcements.length === 0) return null

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-4">
      {announcements.map((a) => (
        <AnnouncementCard
          key={a.id}
          announcement={a}
          token={token}
          primaryDraftOrderId={primaryDraftOrderId}
          showPrices={showPrices}
        />
      ))}
    </div>
  )
}
