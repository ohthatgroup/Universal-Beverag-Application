import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { getRequestDb } from '@/lib/server/db'
import { ManageUsualsList, type ManageUsualsProduct } from '@/components/portal/manage-usuals-list'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { getProductPackLabel } from '@/lib/utils'

interface CatalogProductRow {
  id: string
  title: string
  brand_id: string | null
  pack_details: string | null
  pack_count: number | null
  size_value: number | null
  size_uom: string | null
  price: number
  image_url: string | null
}

interface BrandRow {
  id: string
  name: string
}

interface CustomerProductRow {
  product_id: string
  excluded: boolean
  custom_price: number | null
  is_usual: boolean | null
}

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { customerId, profile } = await resolveCustomerToken(token)
  const db = await getRequestDb()

  const [productsResult, brandsResult, customerProductsResult] = await Promise.all([
    db.query<CatalogProductRow>(
      `select id, title, brand_id, pack_details, pack_count, size_value, size_uom, price, image_url
       from products
       where is_discontinued = false
         and (customer_id is null or customer_id = $1)
       order by sort_order asc`,
      [customerId],
    ),
    db.query<BrandRow>(
      `select id, name from brands order by sort_order asc`,
    ),
    db.query<CustomerProductRow>(
      `select product_id, excluded, custom_price, is_usual
       from customer_products
       where customer_id = $1`,
      [customerId],
    ),
  ])

  const brandById = new Map(brandsResult.rows.map((b) => [b.id, b.name]))
  const customerProductById = new Map(
    customerProductsResult.rows.map((cp) => [cp.product_id, cp]),
  )

  const products: ManageUsualsProduct[] = productsResult.rows
    .filter((p) => !customerProductById.get(p.id)?.excluded)
    .map((p) => {
      const cp = customerProductById.get(p.id)
      const customPrice = cp?.custom_price ?? null
      const effectivePrice = customPrice ?? Number(p.price)
      return {
        id: p.id,
        title: p.title,
        brandName: p.brand_id ? brandById.get(p.brand_id) ?? null : null,
        packLabel: getProductPackLabel(p),
        price: effectivePrice,
        imageUrl: p.image_url,
        isUsual: Boolean(cp?.is_usual),
      }
    })

  return (
    <div className="space-y-6">
      <PortalPageHeader
        back={{ href: `/portal/${token}` }}
        title="Catalog"
        subtitle="Toggle items to keep them in your usuals"
      />
      <ManageUsualsList
        token={token}
        initialProducts={products}
        showPrices={profile.show_prices}
      />
    </div>
  )
}
