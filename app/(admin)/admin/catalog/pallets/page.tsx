import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PalletDealsManager, type PalletDealRow } from '@/components/admin/pallet-deals-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { createEmptyPalletAction } from './actions'

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
      <div>
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin
        </Link>
        <h1 className="text-2xl font-semibold">Pallet Deals</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} deal{rows.length === 1 ? '' : 's'}
        </p>
      </div>

      <LiveQueryInput
        placeholder="Search pallets..."
        initialValue={searchQuery}
        className="w-full"
      />

      <PalletDealsManager
        deals={rows}
        searchQuery={searchQuery}
        createAction={createEmptyPalletAction}
      />
    </div>
  )
}
