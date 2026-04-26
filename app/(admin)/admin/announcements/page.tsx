import { AnnouncementsManager } from '@/components/admin/announcements-manager'
import type { PickerProduct } from '@/components/admin/product-picker'
import { PageHeader } from '@/components/ui/page-header'
import { fetchAllAnnouncements } from '@/lib/server/announcements'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { getProductPackLabel } from '@/lib/utils'

export default async function AnnouncementsPage() {
  await requirePageAuth(['salesman'])

  // Lightweight product list for the dialog's CTA destination + product
  // spotlight + specials grid pickers. Same filter as the order-builder
  // catalog query: discontinued excluded, customer-scoped products excluded
  // (we're admin so all customer-shared products are eligible).
  const db = await getRequestDb()
  const [announcements, productsResult, brandsResult] = await Promise.all([
    fetchAllAnnouncements(db),
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
        title="Deals & Announcements"
        description="Curated deals and editorial content shown on the customer homepage."
      />
      <AnnouncementsManager
        initialAnnouncements={announcements}
        pickerProducts={pickerProducts}
      />
    </div>
  )
}
