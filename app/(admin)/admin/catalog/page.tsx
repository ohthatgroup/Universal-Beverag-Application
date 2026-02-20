import { CatalogProductsManager, type CatalogBrandOption, type CatalogProductRow } from '@/components/admin/catalog-products-manager'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { getProductPackLabel } from '@/lib/utils'

interface CatalogPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  await requirePageAuth(['salesman'])
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const [{ data: products, error: productsError }, { data: brands, error: brandsError }] = await Promise.all([
    supabase
      .from('products')
      .select('id,title,pack_details,pack_count,size_value,size_uom,price,is_new,is_discontinued,sort_order,brand_id')
      .order('sort_order', { ascending: true }),
    supabase.from('brands').select('id,name').order('sort_order', { ascending: true }),
  ])

  if (productsError) throw productsError
  if (brandsError) throw brandsError

  const brandById = new Map((brands ?? []).map((brand) => [brand.id, brand.name]))

  const filteredProducts = (products ?? []).filter((product) => {
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

  const rows: CatalogProductRow[] = filteredProducts.map((product) => ({
    id: product.id,
    title: product.title,
    brandName: brandById.get(product.brand_id ?? '') ?? null,
    packLabel: getProductPackLabel(product),
    price: Number(product.price ?? 0),
    isNew: Boolean(product.is_new),
    isDiscontinued: Boolean(product.is_discontinued),
  }))

  const brandOptions: CatalogBrandOption[] = (brands ?? []).map((brand) => ({
    id: brand.id,
    name: brand.name,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catalog</h1>
      </div>

      <CatalogProductsManager
        products={rows}
        brands={brandOptions}
        searchQuery={searchQuery}
      />
    </div>
  )
}

