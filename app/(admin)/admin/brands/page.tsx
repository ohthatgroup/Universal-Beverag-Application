import { BrandsTableManager, type BrandTableRow } from '@/components/admin/brands-table-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

interface BrandsPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  await requirePageAuth(['salesman'])
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const { data: brands, error } = await supabase
    .from('brands')
    .select('id,name,logo_url,sort_order')
    .order('sort_order', { ascending: true })

  if (error) throw error

  const brandRows: BrandTableRow[] = (brands ?? [])
    .filter((brand) => {
      if (!searchTerm) return true
      return brand.name.toLowerCase().includes(searchTerm)
    })
    .map((brand) => ({
      id: brand.id,
      name: brand.name,
      logoUrl: brand.logo_url ?? null,
    }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Brands</h1>
      </div>

      <LiveQueryInput
        placeholder="Search brands..."
        initialValue={searchQuery}
        className="w-full sm:w-80"
      />

      <BrandsTableManager brands={brandRows} searchQuery={searchQuery} />
    </div>
  )
}
