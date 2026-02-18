import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency } from '@/lib/utils'

export default async function PalletsPage() {
  await requirePageAuth(['salesman'])
  const supabase = await createClient()

  const { data: palletDeals, error } = await supabase
    .from('pallet_deals')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error

  async function createPallet(formData: FormData) {
    'use server'

    const supabaseClient = await createClient()
    const price = Number((formData.get('price') as string) || 0)

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Price must be greater than zero')
    }

    const { error: insertError } = await supabaseClient.from('pallet_deals').insert({
      title: (formData.get('title') as string).trim(),
      pallet_type: (formData.get('pallet_type') as 'single' | 'mixed') || 'single',
      price,
      savings_text: (formData.get('savings_text') as string) || null,
      description: (formData.get('description') as string) || null,
      is_active: formData.get('is_active') === 'on',
    })

    if (insertError) throw insertError
    redirect('/admin/catalog/pallets')
  }

  const deals = palletDeals ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Catalog
        </Link>
        <h1 className="text-2xl font-semibold">Pallet Deals</h1>
      </div>

      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-medium text-sm">
          <Plus className="h-4 w-4" />
          New Pallet Deal
        </summary>
        <div className="border-t p-4">
          <form action={createPallet} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pallet_type">Type</Label>
              <select id="pallet_type" name="pallet_type" defaultValue="single" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="single">Single</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="savings_text">Savings text</Label>
              <Input id="savings_text" name="savings_text" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked type="checkbox" name="is_active" className="h-4 w-4" />
              Active
            </label>
            <Button type="submit">Create Deal</Button>
          </form>
        </div>
      </details>

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pallet deals.</p>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-0 md:hidden">
            {deals.map((deal) => (
              <Link key={deal.id} href={`/admin/catalog/pallets/${deal.id}`} className="flex items-center justify-between border-b py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{deal.title}</div>
                  <div className="text-xs text-muted-foreground">{deal.pallet_type} · {deal.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="ml-3 text-sm">{formatCurrency(deal.price)}</div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border">
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
                      <span className={deal.is_active ? 'text-green-600 text-xs' : 'text-muted-foreground text-xs'}>
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
