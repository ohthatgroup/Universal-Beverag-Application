import { BrandsTableManager, type BrandTableRow } from '@/components/admin/brands-table-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

interface BrandsPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const { rows: brands } = await db.query<{
    id: string
    name: string
    logo_url: string | null
    sort_order: number
  }>('select id, name, logo_url, sort_order from brands order by sort_order asc')

  const brandRows: BrandTableRow[] = brands
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
    <div className="space-y-5">
      <PageHeader
        title="Brands"
        description={`${brandRows.length} brand${brandRows.length === 1 ? '' : 's'}`}
      />

      <LiveQueryInput
        placeholder="Search brands..."
        initialValue={searchQuery}
        className="w-full"
      />

      <BrandsTableManager brands={brandRows} searchQuery={searchQuery} />
    </div>
  )
}
