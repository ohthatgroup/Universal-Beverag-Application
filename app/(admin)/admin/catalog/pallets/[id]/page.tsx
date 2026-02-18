import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function PalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const supabase = await createClient()

  const [{ data: palletDeal, error: dealError }, { data: products }, { data: items }] = await Promise.all([
    supabase.from('pallet_deals').select('*').eq('id', id).maybeSingle(),
    supabase.from('products').select('id,title,pack_details').order('title', { ascending: true }),
    supabase
      .from('pallet_deal_items')
      .select('id,product_id,quantity')
      .eq('pallet_deal_id', id),
  ])

  if (dealError) throw dealError
  if (!palletDeal) notFound()

  const itemByProduct = new Map<string, any>(((items ?? []) as any[]).map((item) => [item.product_id, item]))

  async function updatePallet(formData: FormData) {
    'use server'

    const supabaseClient = await createClient()
    const price = Number((formData.get('price') as string) || 0)

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Price must be greater than zero')
    }

    const { error } = await supabaseClient
      .from('pallet_deals')
      .update({
        title: (formData.get('title') as string).trim(),
        pallet_type: (formData.get('pallet_type') as 'single' | 'mixed') || 'single',
        image_url: (formData.get('image_url') as string) || null,
        price,
        savings_text: (formData.get('savings_text') as string) || null,
        description: (formData.get('description') as string) || null,
        is_active: formData.get('is_active') === 'on',
        sort_order: Number((formData.get('sort_order') as string) || 0),
      })
      .eq('id', id)

    if (error) throw error
    redirect(`/admin/catalog/pallets/${id}`)
  }

  async function updatePalletItem(formData: FormData) {
    'use server'

    const productId = formData.get('product_id') as string
    const quantity = Number((formData.get('quantity') as string) || 0)

    const supabaseClient = await createClient()

    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error('Quantity must be zero or greater')
    }

    if (quantity === 0) {
      const { error } = await supabaseClient
        .from('pallet_deal_items')
        .delete()
        .eq('pallet_deal_id', id)
        .eq('product_id', productId)

      if (error) throw error
      redirect(`/admin/catalog/pallets/${id}`)
    }

    const { error } = await supabaseClient.from('pallet_deal_items').upsert(
      {
        pallet_deal_id: id,
        product_id: productId,
        quantity,
      },
      {
        onConflict: 'pallet_deal_id,product_id',
      }
    )

    if (error) throw error
    redirect(`/admin/catalog/pallets/${id}`)
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pallet Deal</h1>
        <Link className="text-sm underline" href="/admin/catalog/pallets">
          Back to pallets
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePallet} className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={palletDeal.title} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pallet_type">Type</Label>
              <select
                id="pallet_type"
                name="pallet_type"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue={palletDeal.pallet_type}
              >
                <option value="single">Single</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" name="price" type="number" step="0.01" defaultValue={palletDeal.price} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort order</Label>
                <Input id="sort_order" name="sort_order" type="number" defaultValue={palletDeal.sort_order} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input id="image_url" name="image_url" defaultValue={palletDeal.image_url ?? ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="savings_text">Savings text</Label>
              <Input id="savings_text" name="savings_text" defaultValue={palletDeal.savings_text ?? ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" defaultValue={palletDeal.description ?? ''} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={palletDeal.is_active} />
              Active
            </label>

            <Button type="submit">Save deal</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal Contents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {((products ?? []) as any[]).map((product) => {
            const item = itemByProduct.get(product.id) as any
            return (
              <form key={product.id} action={updatePalletItem} className="grid grid-cols-[1fr_auto_auto] items-end gap-2 rounded-md border p-3">
                <input type="hidden" name="product_id" value={product.id} />
                <div>
                  <div className="text-sm font-medium">{product.title}</div>
                  <div className="text-xs text-muted-foreground">{product.pack_details ?? 'N/A'}</div>
                </div>
                <Input
                  className="w-24"
                  name="quantity"
                  type="number"
                  min="0"
                  defaultValue={item?.quantity ?? 0}
                />
                <Button size="sm" type="submit">
                  Save
                </Button>
              </form>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
