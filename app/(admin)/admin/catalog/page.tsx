import { CatalogRowsManager } from '@/components/admin/catalog-rows-manager'
import type { CatalogRowData } from '@/components/admin/catalog-row'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { MomentStream } from '@/components/admin/moment-stream'
import { SegmentedFilters } from '@/components/admin/segmented-filters'
import { PageHeader } from '@/components/ui/page-header'
import { getCatalogPageMoments } from '@/lib/server/admin-prompts'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { getProductPackLabel } from '@/lib/utils'

interface CatalogPageProps {
  searchParams?: Promise<{
    q?: string
    status?: string
  }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()
  const statusFilter = (resolvedSearchParams?.status ?? 'all').trim()

  const [
    { rows: products },
    { rows: brands },
    { rows: dealCounts },
    moments,
  ] = await Promise.all([
    db.query<{
      id: string
      title: string
      pack_details: string | null
      pack_count: number | null
      size_value: number | null
      size_uom: string | null
      price: number
      is_new: boolean | null
      is_discontinued: boolean | null
      sort_order: number
      brand_id: string | null
      image_url: string | null
    }>(
      `select id, title, pack_details, pack_count, size_value, size_uom, price, is_new, is_discontinued, sort_order, brand_id, image_url
       from products
       where customer_id is null
       order by sort_order asc`,
    ),
    db.query<{ id: string; name: string }>(
      'select id, name from brands order by sort_order asc',
    ),
    db.query<{ product_id: string; count: number }>(
      `select unnest(product_ids) as product_id, count(*)::int as count
         from announcements
        where kind = 'deal' and is_active = true
        group by 1`,
    ),
    getCatalogPageMoments(db),
  ])

  const brandById = new Map(brands.map((brand) => [brand.id, brand.name]))
  const dealCountByProductId = new Map(
    dealCounts.map((row) => [row.product_id, row.count]),
  )

  const filteredProducts = products.filter((product) => {
    // Status filter — exclusive: choose one of all/active/discontinued/in-deals.
    if (statusFilter === 'discontinued' && !product.is_discontinued) return false
    if (statusFilter === 'active' && product.is_discontinued) return false
    if (statusFilter === 'in-deals' && !dealCountByProductId.has(product.id))
      return false

    if (!searchTerm) return true
    const haystack = [
      product.title ?? '',
      getProductPackLabel(product) ?? '',
      brandById.get(product.brand_id ?? '') ?? '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(searchTerm)
  })

  const rows: CatalogRowData[] = filteredProducts.map((product) => ({
    id: product.id,
    title: product.title,
    brandName: brandById.get(product.brand_id ?? '') ?? null,
    packLabel: getProductPackLabel(product),
    imageUrl: product.image_url,
    price: Number(product.price ?? 0),
    isNew: Boolean(product.is_new),
    isDiscontinued: Boolean(product.is_discontinued),
    inActiveDealsCount: dealCountByProductId.get(product.id) ?? 0,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catalog"
        description={`${rows.length} product${rows.length === 1 ? '' : 's'}`}
      />

      <MomentStream moments={moments} />

      <CatalogRowsManager
        rows={rows}
        searchQuery={searchQuery}
        search={
          <LiveQueryInput
            placeholder="Search products..."
            initialValue={searchQuery}
            className="w-full"
          />
        }
        filters={
          <SegmentedFilters
            paramKey="status"
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'discontinued', label: 'Discontinued' },
              { value: 'in-deals', label: 'In deals' },
            ]}
            label="Filter products by status"
          />
        }
      />
    </div>
  )
}
