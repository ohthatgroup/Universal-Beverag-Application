import { AnnouncementCard } from '@/components/portal/announcement-card'
import type { CatalogProduct } from '@/lib/types'

export type AnnouncementContentType =
  | 'text'
  | 'image'
  | 'image_text'
  | 'product'
  | 'specials_grid'

/**
 * Top-level intent. Both kinds use the same content_type rendering, but
 * deals show under a "Deals" section in the admin and (eventually) get
 * different badging on the customer side.
 *
 *   'announcement' → editorial / informational content
 *   'deal'         → pallet-style preselect, typically with locked
 *                    quantities authored by the salesman
 */
export type AnnouncementKind = 'announcement' | 'deal'

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

/**
 * Per-product preselection authored by the salesman. Missing entries (or
 * empty `default_qty`) fall back to "stepper starts at the customer's
 * existing-draft qty (or 0)". `locked: true` makes the row non-editable in
 * the drawer — the customer commits at exactly `default_qty`.
 */
export interface ProductQuantityOverride {
  default_qty?: number
  locked?: boolean
}

export interface Announcement {
  id: string
  kind: AnnouncementKind
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
  product_quantities: Record<string, ProductQuantityOverride>
  /**
   * Legacy heuristic targeting via free-text tags. No longer consulted by
   * the resolver as of migration 202604260007 — superseded by
   * `target_group_ids`. Kept on the type for back-compat with existing
   * data; future cleanup migration can drop the column + this field.
   */
  audience_tags: string[]
  /**
   * Group-based targeting. Empty array = visible to ALL groups
   * (broadcast). Non-empty = only customers whose `customer_group_id`
   * is in this list see the announcement.
   */
  target_group_ids: string[]
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
  primaryDraftDate?: string | null
  showPrices: boolean
  /**
   * Pre-resolved per-card products keyed by announcement id. Spotlight cards
   * pull their single product from `product`; specials-grid cards pull their
   * tile list from `products`. Editorial cards ignore this — they open the
   * drawer instead.
   */
  resolvedProductsByAnnouncement?: Record<
    string,
    { product: CatalogProduct | null; products: CatalogProduct[] }
  >
  /**
   * Pre-resolved drawer products keyed by announcement id. When non-null,
   * the card surface is clickable and opens `<PromoSheet>` with these
   * products. When null, the card is non-clickable (or the CTA is a real
   * url-target link, handled separately by the card body).
   */
  drawerProductsByAnnouncement?: Record<
    string,
    { products: CatalogProduct[]; hasMissingProducts: boolean } | null
  >
  /**
   * product_id → qty in the customer's primary draft. Seeded into the
   * drawer's steppers on every open.
   */
  initialQuantitiesByProductId?: Record<string, number>
}

export async function AnnouncementsStack({
  announcements,
  token,
  primaryDraftOrderId,
  primaryDraftDate = null,
  showPrices,
  resolvedProductsByAnnouncement,
  drawerProductsByAnnouncement,
  initialQuantitiesByProductId = {},
}: AnnouncementsStackProps) {
  if (announcements.length === 0) return null

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-4">
      {announcements.map((a) => {
        const resolved = resolvedProductsByAnnouncement?.[a.id]
        const drawer = drawerProductsByAnnouncement?.[a.id] ?? null
        return (
          <AnnouncementCard
            key={a.id}
            announcement={a}
            token={token}
            primaryDraftOrderId={primaryDraftOrderId}
            primaryDraftDate={primaryDraftDate}
            showPrices={showPrices}
            resolvedProduct={resolved?.product ?? null}
            resolvedProducts={resolved?.products}
            drawerProducts={drawer?.products ?? null}
            drawerHasMissing={drawer?.hasMissingProducts ?? false}
            initialQuantitiesByProductId={initialQuantitiesByProductId}
          />
        )
      })}
    </div>
  )
}
