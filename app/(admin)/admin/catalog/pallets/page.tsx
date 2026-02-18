import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

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

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pallet Deals</h1>
        <Link className="text-sm underline" href="/admin/catalog">
          Back to catalog
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Pallet Deal</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPallet} className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pallet_type">Type</Label>
              <select
                id="pallet_type"
                name="pallet_type"
                defaultValue="single"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked type="checkbox" name="is_active" />
              Active
            </label>

            <Button type="submit">Create Deal</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing Deals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(palletDeals ?? []).map((deal) => (
            <div key={deal.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{deal.title}</div>
              <div className="text-xs text-muted-foreground">
                {deal.pallet_type} • ${Number(deal.price).toFixed(2)} • active={String(deal.is_active)}
              </div>
              <Link className="text-xs underline" href={`/admin/catalog/pallets/${deal.id}`}>
                Edit deal
              </Link>
            </div>
          ))}
          {(palletDeals ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No pallet deals.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
