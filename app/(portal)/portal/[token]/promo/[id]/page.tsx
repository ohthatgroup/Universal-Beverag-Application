import { notFound } from 'next/navigation'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { PromoProductGrid } from '@/components/portal/promo-product-grid'
import {
  fetchAnnouncementById,
  resolvePromoProductIds,
} from '@/lib/server/announcements'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { getRequestDb } from '@/lib/server/db'
import { getProductPackLabel, todayISODate } from '@/lib/utils'
import type { PromoProduct } from '@/components/portal/promo-product-grid'

export default async function PromoPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>
}) {
  const { token, id } = await params
  const { customerId, profile } = await resolveCustomerToken(token)
  const db = await getRequestDb()
  const today = todayISODate()

  const announcement = await fetchAnnouncementById(db, id)
  if (!announcement) {
    notFound()
  }

  const productIds = resolvePromoProductIds(announcement)
  if (productIds.length === 0) {
    notFound()
  }

  // Resolve product details + the customer's primary draft (so steppers
  // can autosave into it). Same pattern as the order builder's RSC.
  const [productsResult, brandsResult, customerProductsResult, draftResult] =
    await Promise.all([
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
          where id = ANY($1::uuid[])
            and is_discontinued = false`,
        [productIds],
      ),
      db.query<{ id: string; name: string }>(
        `select id, name from brands order by sort_order asc`,
      ),
      db.query<{ product_id: string; custom_price: number | null }>(
        `select product_id, custom_price
           from customer_products
          where customer_id = $1
            and excluded = false`,
        [customerId],
      ),
      db.query<{
        id: string
        delivery_date: string
        product_id: string | null
        quantity: number
      }>(
        `select o.id, o.delivery_date::text, oi.product_id, oi.quantity
           from orders o
           left join order_items oi on oi.order_id = o.id
          where o.customer_id = $1
            and o.status = 'draft'
            and o.delivery_date >= $2
          order by o.delivery_date asc`,
        [customerId, today],
      ),
    ])

  const brandById = new Map(brandsResult.rows.map((b) => [b.id, b.name]))
  const customPriceByProductId = new Map(
    customerProductsResult.rows.map((cp) => [cp.product_id, cp.custom_price]),
  )

  // Preserve the order of productIds so the salesman's curation order
  // is honoured.
  const productMap = new Map(productsResult.rows.map((p) => [p.id, p]))
  const products: PromoProduct[] = productIds
    .map((pid) => productMap.get(pid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => {
      const customPrice = customPriceByProductId.get(p.id) ?? null
      const effectivePrice = customPrice ?? Number(p.price)
      return {
        id: p.id,
        title: p.title,
        brandName: p.brand_id ? brandById.get(p.brand_id) ?? null : null,
        packLabel: getProductPackLabel(p),
        price: effectivePrice,
        imageUrl: p.image_url,
      }
    })

  // Some product UUIDs in the announcement may no longer exist in `products`
  // (deleted, discontinued, etc.). Surface a one-line muted notice rather
  // than 404'ing the page — render whatever does still resolve.
  const hasMissingProducts = products.length < productIds.length

  // Primary draft = first one by delivery date (matches homepage logic).
  const draftRows = draftResult.rows
  const primaryDraftId = draftRows[0]?.id ?? null
  const primaryDraftDate = draftRows[0]?.delivery_date ?? null
  // Map of productId -> qty in the primary draft, so the steppers
  // start with the right values.
  const initialQuantities: Record<string, number> = {}
  if (primaryDraftId) {
    for (const row of draftRows) {
      if (row.id !== primaryDraftId) continue
      if (row.product_id && row.quantity > 0) {
        initialQuantities[row.product_id] = row.quantity
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-6 pt-2">
      <PortalPageHeader
        back={{ href: `/portal/${token}` }}
        title={announcement.title ?? 'Promotion'}
        subtitle={
          announcement.body ??
          `${products.length} ${products.length === 1 ? 'product' : 'products'}`
        }
      />

      <PromoProductGrid
        token={token}
        products={products}
        initialQuantities={initialQuantities}
        primaryDraftId={primaryDraftId}
        primaryDraftDate={primaryDraftDate}
        showPrices={profile.show_prices}
        hasMissingProducts={hasMissingProducts}
      />
    </div>
  )
}
