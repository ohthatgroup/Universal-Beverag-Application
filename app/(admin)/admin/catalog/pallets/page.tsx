import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency } from '@/lib/utils'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pallet Deals</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action={createEmptyPallet}>
          <Button size="sm" type="submit">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Pallet
          </Button>
        </form>
        <LiveQueryInput
          placeholder="Search pallets..."
          initialValue={searchQuery}
          className="w-full sm:w-80"
        />
      </div>

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pallet deals.</p>
      ) : (
        <>
          <div className="space-y-0 md:hidden">
            {deals.map((deal) => (
              <Link key={deal.id} href={`/admin/catalog/pallets/${deal.id}`} className="flex items-center justify-between border-b py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{deal.title}</div>
                  <div className="text-xs text-muted-foreground">{deal.pallet_type} - {deal.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="ml-3 text-sm">{formatCurrency(deal.price)}</div>
              </Link>
            ))}
          </div>

          <div className="hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/catalog/pallets/${deal.id}`} className="font-medium hover:underline">{deal.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{deal.pallet_type}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(deal.price)}</td>
                    <td className="px-4 py-3">
                      <span className={deal.is_active ? 'text-xs text-green-600' : 'text-xs text-muted-foreground'}>
                        {deal.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
