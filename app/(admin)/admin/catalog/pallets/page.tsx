import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { PalletDealsManager, type PalletDealRow } from '@/components/admin/pallet-deals-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

interface PalletsPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function PalletsPage({ searchParams }: PalletsPageProps) {
  await requirePageAuth(['salesman'])
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const { data: palletDeals, error } = await supabase
    .from('pallet_deals')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error

  async function createEmptyPallet() {
    'use server'

    await requirePageAuth(['salesman'])
    const supabaseClient = await createClient()

    const { data: created, error: insertError } = await supabaseClient
      .from('pallet_deals')
      .insert({
        title: 'New Pallet Deal',
        pallet_type: 'single',
        price: 0.01,
        savings_text: null,
        description: null,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertError || !created) throw insertError ?? new Error('Failed to create pallet deal')
    redirect(`/admin/catalog/pallets/${created.id}`)
  }

  const deals = (palletDeals ?? []).filter((deal) => {
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
