import { LiveQueryInput } from '@/components/admin/live-query-input'
import { PresetsList, type PresetListRow } from '@/components/admin/presets-list'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

interface PresetsPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function PresetsPage({ searchParams }: PresetsPageProps) {
  await requirePageAuth(['salesman'])
  const resolved = searchParams ? await searchParams : undefined

  const searchQuery = (resolved?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const db = await getRequestDb()
  const { rows } = await db.query<{
    id: string
    name: string
    brand_count: number
    size_count: number
    product_count: number
  }>(
    `select
       p.id,
       p.name,
       coalesce(b.n, 0)::int as brand_count,
       coalesce(s.n, 0)::int as size_count,
       coalesce(pr.n, 0)::int as product_count
     from presets p
     left join (
       select preset_id, count(*) as n from preset_brand_rules
       where is_hidden or is_pinned
       group by preset_id
     ) b on b.preset_id = p.id
     left join (
       select preset_id, count(*) as n from preset_size_rules
       where is_hidden
       group by preset_id
     ) s on s.preset_id = p.id
     left join (
       select preset_id, count(*) as n from preset_product_rules
       group by preset_id
     ) pr on pr.preset_id = p.id
     order by p.name asc`
  )

  const presets: PresetListRow[] = rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      brandCount: row.brand_count,
      sizeCount: row.size_count,
      productCount: row.product_count,
    }))
    .filter((preset) => {
      if (!searchTerm) return true
      return preset.name.toLowerCase().includes(searchTerm)
    })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Presets"
        description={`${presets.length} catalog preset${presets.length === 1 ? '' : 's'}`}
      />

      <PresetsList
        presets={presets}
        searchQuery={searchQuery}
        search={
          <LiveQueryInput
            placeholder="Search presets..."
            initialValue={searchQuery}
            className="w-full"
          />
        }
      />
    </div>
  )
}
