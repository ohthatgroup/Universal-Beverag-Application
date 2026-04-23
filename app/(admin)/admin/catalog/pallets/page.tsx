import { PalletDealsManager, type PalletDealRow } from '@/components/admin/pallet-deals-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

interface PalletsPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function PalletsPage({ searchParams }: PalletsPageProps) {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const { rows: palletDeals } = await db.query<{
    id: string
    title: string
    pallet_type: string
    price: number
    is_active: boolean | null
    description: string | null
  }>('select id, title, pallet_type, price, is_active, description from pallet_deals order by sort_order asc')

  const deals = palletDeals.filter((deal) => {
    if (!searchTerm) return true
    const haystack = [deal.title ?? '', deal.description ?? '', deal.pallet_type ?? '']
      .join(' ')
      .toLowerCase()
    return haystack.includes(searchTerm)
  })

  const rows: PalletDealRow[] = deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    palletType: deal.pallet_type === 'mixed' ? 'mixed' : 'single',
    price: Number(deal.price ?? 0),
    isActive: Boolean(deal.is_active),
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pallet Deals"
        description={`${rows.length} deal${rows.length === 1 ? '' : 's'}`}
      />

      <PalletDealsManager
        deals={rows}
        searchQuery={searchQuery}
        search={
          <LiveQueryInput
            placeholder="Search pallets..."
            initialValue={searchQuery}
            className="w-full"
          />
        }
      />
    </div>
  )
}
