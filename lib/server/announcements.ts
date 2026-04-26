// Server-only helpers for announcements. Used by the homepage RSC, the
// promo-route RSC, and the admin announcements list.
//
// The `announcements` table backs all three surfaces. Per-customer overrides
// (hide/pin) live on `customer_announcements` and are applied in
// `fetchHomepageAnnouncements`.

import type {
  Announcement,
  ProductQuantityOverride,
} from '@/components/portal/announcements-stack'
import type { DbFacade } from '@/lib/server/db'
import type { CatalogProduct } from '@/lib/types'

interface AnnouncementRow {
  id: string
  kind: string
  content_type: string
  title: string | null
  body: string | null
  image_url: string | null
  cta_label: string | null
  cta_target_kind: string | null
  cta_target_url: string | null
  cta_target_product_id: string | null
  cta_target_product_ids: string[] | null
  product_id: string | null
  product_ids: string[] | null
  badge_overrides: Record<string, string> | null
  product_quantities: Record<string, ProductQuantityOverride> | null
  audience_tags: string[] | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  sort_order: number
  created_at: string | Date
  updated_at: string | Date
}

interface AnnouncementWithOverrideRow extends AnnouncementRow {
  // Resolved values from the override cascade: customer overrides win,
  // then group, then the announcement's own column. Selected as
  // `effective_*` from the SQL so the rowToAnnouncement mapper just
  // overlays them.
  effective_is_hidden: boolean | null
  effective_sort_order: number | null
}

function toIsoString(value: string | Date | null): string {
  if (value instanceof Date) return value.toISOString()
  return value ?? ''
}

function toIsoDate(value: string | Date | null): string | null {
  if (value === null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value
}

export function rowToAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    kind: (row.kind ?? 'announcement') as Announcement['kind'],
    content_type: row.content_type as Announcement['content_type'],
    title: row.title,
    body: row.body,
    image_url: row.image_url,
    cta_label: row.cta_label,
    cta_target_kind: (row.cta_target_kind ?? null) as Announcement['cta_target_kind'],
    cta_target_url: row.cta_target_url,
    cta_target_product_id: row.cta_target_product_id,
    cta_target_product_ids: row.cta_target_product_ids ?? [],
    product_id: row.product_id,
    product_ids: row.product_ids ?? [],
    badge_overrides: row.badge_overrides ?? {},
    product_quantities: row.product_quantities ?? {},
    audience_tags: row.audience_tags ?? [],
    starts_at: toIsoDate(row.starts_at),
    ends_at: toIsoDate(row.ends_at),
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  }
}

const ANNOUNCEMENT_COLUMNS_UNPREFIXED = `
  id,
  kind,
  content_type,
  title,
  body,
  image_url,
  cta_label,
  cta_target_kind,
  cta_target_url,
  cta_target_product_id,
  cta_target_product_ids,
  product_id,
  product_ids,
  badge_overrides,
  product_quantities,
  audience_tags,
  starts_at::text as starts_at,
  ends_at::text as ends_at,
  is_active,
  sort_order,
  created_at,
  updated_at
`

const ANNOUNCEMENT_COLUMNS_A_PREFIXED = `
  a.id,
  a.kind,
  a.content_type,
  a.title,
  a.body,
  a.image_url,
  a.cta_label,
  a.cta_target_kind,
  a.cta_target_url,
  a.cta_target_product_id,
  a.cta_target_product_ids,
  a.product_id,
  a.product_ids,
  a.badge_overrides,
  a.product_quantities,
  a.audience_tags,
  a.starts_at::text as starts_at,
  a.ends_at::text as ends_at,
  a.is_active,
  a.sort_order,
  a.created_at,
  a.updated_at
`

/**
 * Homepage query — resolves the announcement cascade for a single
 * customer. Cascade order (most-specific wins per column):
 *
 *   1. customer override — `announcement_overrides` where scope='customer'
 *      and scope_id = customer_id
 *   2. group override    — `announcement_overrides` where scope='group'
 *      and scope_id = the customer's profiles.customer_group_id
 *   3. global default    — announcements.is_active / .sort_order
 *
 * `is_hidden` and `sort_order` cascade independently. A customer can
 * inherit a group's pinned order while overriding only visibility, etc.
 *
 * Audience-tag filter still applies on top — a hidden override is
 * unnecessary when the announcement doesn't match the customer's tags
 * at all.
 */
export async function fetchHomepageAnnouncements(
  db: DbFacade,
  customerId: string,
  audienceTags: string[],
): Promise<Announcement[]> {
  const { rows } = await db.query<AnnouncementWithOverrideRow>(
    `select ${ANNOUNCEMENT_COLUMNS_A_PREFIXED},
            -- Resolved is_hidden: customer wins, then group, then false.
            coalesce(co.is_hidden, go.is_hidden, false) as effective_is_hidden,
            -- Resolved sort_order: customer wins, then group, then announcement.
            coalesce(co.sort_order, go.sort_order, a.sort_order) as effective_sort_order
       from announcements a
       -- Resolve the customer's group once, then left-join overrides at
       -- both scopes for this announcement.
       left join profiles p on p.id = $1
       left join announcement_overrides co
         on co.announcement_id = a.id
        and co.scope = 'customer'
        and co.scope_id = $1
       left join announcement_overrides go
         on go.announcement_id = a.id
        and go.scope = 'group'
        and go.scope_id = p.customer_group_id
      where a.is_active
        and (a.starts_at is null or a.starts_at <= now())
        and (a.ends_at   is null or a.ends_at   >= now())
        and (a.audience_tags = '{}' or a.audience_tags && $2::text[])
        and coalesce(co.is_hidden, go.is_hidden, false) = false
      order by
        coalesce(co.sort_order, go.sort_order, a.sort_order) asc,
        a.created_at asc`,
    [customerId, audienceTags],
  )
  return rows.map(rowToAnnouncement)
}

/** Resolve a single announcement by id (used by the promo route). */
export async function fetchAnnouncementById(
  db: DbFacade,
  id: string,
): Promise<Announcement | null> {
  const { rows } = await db.query<AnnouncementRow>(
    `select ${ANNOUNCEMENT_COLUMNS_UNPREFIXED} from announcements where id = $1 limit 1`,
    [id],
  )
  const row = rows[0]
  return row ? rowToAnnouncement(row) : null
}

/** Admin list — every announcement, ordered by sort_order. */
export async function fetchAllAnnouncements(
  db: DbFacade,
): Promise<Announcement[]> {
  const { rows } = await db.query<AnnouncementRow>(
    `select ${ANNOUNCEMENT_COLUMNS_UNPREFIXED} from announcements order by sort_order asc, created_at asc`,
  )
  return rows.map(rowToAnnouncement)
}

/**
 * Given an announcement, return the product IDs that the /promo route or
 * `<PromoSheet>` should display. Order:
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
 * Inline-card product IDs — what the homepage stack needs to resolve so that
 * `<ProductSpotlightCard>` and `<SpecialsGridCard>` render their products.
 * `text` / `image` / `image_text` cards never embed products inline (their
 * CTAs route to `<PromoSheet>` instead), so they return `[]`.
 */
function inlineProductIds(a: Announcement): string[] {
  if (a.content_type === 'product' && a.product_id) return [a.product_id]
  if (a.content_type === 'specials_grid') return a.product_ids
  return []
}

/**
 * Every product UUID an announcement could need resolved on the homepage —
 * inline products PLUS any product-target CTA on an editorial card. The
 * drawer (`<PromoSheet>`) opens with these.
 */
function allProductIds(a: Announcement): string[] {
  const inline = inlineProductIds(a)
  if (a.cta_target_kind === 'product' && a.cta_target_product_id) {
    return [...inline, a.cta_target_product_id]
  }
  if (a.cta_target_kind === 'products') {
    return [...inline, ...a.cta_target_product_ids]
  }
  return inline
}

interface ProductRow {
  id: string
  brand_id: string | null
  customer_id: string | null
  title: string
  pack_details: string | null
  pack_count: number | null
  size_value: number | null
  size_uom: string | null
  price: string | number
  image_url: string | null
  is_new: boolean
  is_discontinued: boolean
  tags: string[] | null
  case_length: number | string | null
  case_width: number | string | null
  case_height: number | string | null
  sort_order: number
  created_at: string | Date
  updated_at: string | Date
  product_family: string
  browse_model: string
  subline: string | null
  pack_key: string | null
  water_type: string | null
  price_point: string | null
  is_zero_sugar: boolean
  is_diet: boolean
  is_caffeine_free: boolean
  is_sparkling: boolean
  search_aliases: string[] | null
}

interface BrandRow {
  id: string
  name: string
  logo_url: string | null
  sort_order: number
  created_at: string | Date
}

/**
 * Resolve product details for every inline-card announcement on the homepage
 * stack. Returns a Map keyed by product id, holding `CatalogProduct` rows
 * with `effective_price` (custom_price ?? price) populated.
 *
 * Discontinued products are skipped — the spotlight will fall through to its
 * "Product not found" branch, and the specials grid will render only the
 * surviving tiles.
 */
export async function fetchInlineAnnouncementProducts(
  db: DbFacade,
  announcements: Announcement[],
  customerId: string,
): Promise<Map<string, CatalogProduct>> {
  // Resolve every product an announcement could need — inline products AND
  // product-target CTAs (the drawer body needs the latter).
  const ids = Array.from(
    new Set(announcements.flatMap((a) => allProductIds(a))),
  )
  if (ids.length === 0) return new Map()

  const [productsResult, brandsResult, customerProductsResult] =
    await Promise.all([
      db.query<ProductRow>(
        `select id, brand_id, customer_id, title, pack_details, pack_count,
                size_value, size_uom, price, image_url, is_new, is_discontinued,
                tags, case_length, case_width, case_height, sort_order,
                created_at, updated_at, product_family, browse_model, subline,
                pack_key, water_type, price_point, is_zero_sugar, is_diet,
                is_caffeine_free, is_sparkling, search_aliases
           from products
          where id = ANY($1::uuid[])
            and is_discontinued = false`,
        [ids],
      ),
      db.query<BrandRow>(
        `select id, name, logo_url, sort_order, created_at
           from brands order by sort_order asc`,
      ),
      db.query<{ product_id: string; custom_price: string | number | null }>(
        `select product_id, custom_price
           from customer_products
          where customer_id = $1
            and excluded = false`,
        [customerId],
      ),
    ])

  const brandById = new Map(brandsResult.rows.map((b) => [b.id, b]))
  const customPriceByProductId = new Map(
    customerProductsResult.rows.map((cp) => [
      cp.product_id,
      cp.custom_price === null ? null : Number(cp.custom_price),
    ]),
  )

  const result = new Map<string, CatalogProduct>()
  for (const row of productsResult.rows) {
    const customPrice = customPriceByProductId.get(row.id) ?? null
    const price = Number(row.price)
    const effectivePrice = customPrice ?? price
    const brandRow = row.brand_id ? brandById.get(row.brand_id) : undefined

    result.set(row.id, {
      ...row,
      price,
      case_length: row.case_length === null ? null : Number(row.case_length),
      case_width: row.case_width === null ? null : Number(row.case_width),
      case_height: row.case_height === null ? null : Number(row.case_height),
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : row.created_at,
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : row.updated_at,
      custom_price: customPrice,
      effective_price: effectivePrice,
      brand: brandRow
        ? {
            id: brandRow.id,
            name: brandRow.name,
            logo_url: brandRow.logo_url,
            sort_order: brandRow.sort_order,
            created_at:
              brandRow.created_at instanceof Date
                ? brandRow.created_at.toISOString()
                : brandRow.created_at,
          }
        : undefined,
    })
  }
  return result
}

/**
 * Get the resolved products for a single announcement card. Returns either
 * a single product (for `content_type === 'product'`) or an array preserving
 * the salesman's curation order (for `content_type === 'specials_grid'`).
 */
export function pickResolvedProducts(
  a: Announcement,
  productMap: Map<string, CatalogProduct>,
): { product: CatalogProduct | null; products: CatalogProduct[] } {
  if (a.content_type === 'product') {
    const product = a.product_id ? productMap.get(a.product_id) ?? null : null
    return { product, products: [] }
  }
  if (a.content_type === 'specials_grid') {
    const products = a.product_ids
      .map((id) => productMap.get(id))
      .filter((p): p is CatalogProduct => Boolean(p))
    return { product: null, products }
  }
  return { product: null, products: [] }
}

/**
 * Resolve the products that `<PromoSheet>` should display when the customer
 * taps the announcement banner. Same fallback chain as
 * `resolvePromoProductIds` — CTA target first, then content_type inline ids.
 *
 * Returns `null` when no products should open a drawer (e.g. text card with
 * no CTA, or url-target CTA, or content with all-discontinued products).
 *
 * Also returns `hasMissingProducts` so the drawer can render the
 * "Some products… no longer available" notice when stale UUIDs were
 * skipped.
 */
export function pickDrawerProducts(
  a: Announcement,
  productMap: Map<string, CatalogProduct>,
): { products: CatalogProduct[]; hasMissingProducts: boolean } | null {
  // url targets don't open a drawer — they open in a new tab.
  if (a.cta_target_kind === 'url') return null

  const ids = resolvePromoProductIds(a)
  if (ids.length === 0) return null

  const products = ids
    .map((id) => productMap.get(id))
    .filter((p): p is CatalogProduct => Boolean(p))

  // No surviving products → nothing to show. Caller should treat this as
  // "no drawer."
  if (products.length === 0) return null

  return {
    products,
    hasMissingProducts: products.length < ids.length,
  }
}
