import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { PalletDealsManager, type PalletDealRow } from '@/components/admin/pallet-deals-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { Button } from '@/components/ui/button'
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

  async function createEmptyPallet() {
    'use server'

    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()

    const { rows } = await actionDb.query<{ id: string }>(
      `insert into pallet_deals (title, pallet_type, price, savings_text, description, is_active, sort_order)
       values ('New Pallet Deal', 'single', 0.01, null, null, true, coalesce((select max(sort_order) from pallet_deals), -1) + 1)
       returning id`
    )

    if (!rows[0]) throw new Error('Failed to create pallet deal')
    redirect(`/admin/catalog/pallets/${rows[0].id}`)
  }

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pallet Deals</h1>
      </div>

      <div className="space-y-2 sm:flex sm:items-center sm:gap-2 sm:space-y-0">
        <div className="flex items-center gap-2">
          <form action={createEmptyPallet}>
            <Button size="sm" type="submit">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Pallet
            </Button>
          </form>
        </div>
        <div className="flex items-center gap-2">
          <LiveQueryInput
            placeholder="Search pallets..."
            initialValue={searchQuery}
            className="w-full sm:w-80"
          />
        </div>
      </div>

      <PalletDealsManager deals={rows} searchQuery={searchQuery} />
    </div>
  )
}
