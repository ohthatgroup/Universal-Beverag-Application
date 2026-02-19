import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { getProductPackLabel } from '@/lib/utils'

export default async function PalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const supabase = await createClient()

  const [{ data: palletDeal, error: dealError }, { data: products }, { data: items }] = await Promise.all([
    supabase.from('pallet_deals').select('*').eq('id', id).maybeSingle(),
    supabase.from('products').select('id,title,pack_details,pack_count,size_value,size_uom').order('title', { ascending: true }),
    supabase
      .from('pallet_deal_items')
      .select('id,product_id,quantity')
      .eq('pallet_deal_id', id),
  ])

  if (dealError) throw dealError
  if (!palletDeal) notFound()

  const itemByProduct = new Map(
    (items ?? [])
      .filter((item) => Boolean(item.product_id))
      .map((item) => [item.product_id as string, item] as const)
  )

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
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog/pallets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Pallets
        </Link>
        <h1 className="text-2xl font-semibold">{palletDeal.title}</h1>
      </div>

      <form action={updatePallet} className="space-y-4 max-w-2xl">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={palletDeal.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pallet_type">Type</Label>
            <select id="pallet_type" name="pallet_type" className="h-9 w-full rounded-md border bg-background px-3 text-sm" defaultValue={palletDeal.pallet_type}>
              <option value="single">Single</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" step="0.01" defaultValue={palletDeal.price ?? 0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort order</Label>
            <Input id="sort_order" name="sort_order" type="number" defaultValue={palletDeal.sort_order ?? 0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" name="image_url" defaultValue={palletDeal.image_url ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="savings_text">Savings text</Label>
            <Input id="savings_text" name="savings_text" defaultValue={palletDeal.savings_text ?? ''} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" defaultValue={palletDeal.description ?? ''} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={palletDeal.is_active ?? true} className="h-4 w-4" />
          Active
        </label>
        <Button type="submit">Save Deal</Button>
      </form>

      <Separator />

      {/* Deal contents */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Deal Contents</h2>

        {/* Mobile */}
        <div className="md:hidden space-y-0">
          {(products ?? []).map((product) => {
            const item = itemByProduct.get(product.id)
            return (
              <form key={product.id} action={updatePalletItem} className="flex items-center gap-3 border-b py-3 last:border-0">
                <input type="hidden" name="product_id" value={product.id} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{product.title}</div>
                  <div className="text-xs text-muted-foreground">{getProductPackLabel(product) ?? 'N/A'}</div>
                </div>
                <Input className="w-20 h-8 text-xs" name="quantity" type="number" min="0" defaultValue={item?.quantity ?? 0} />
                <Button size="sm" type="submit" variant="ghost" className="h-8 px-2 text-xs">Save</Button>
              </form>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Product</th>
                <th className="px-4 py-2 text-left font-medium">Pack</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((product) => {
                const item = itemByProduct.get(product.id)
                return (
                  <tr key={product.id} className="border-b last:border-0">
                    <td className="px-4 py-2" colSpan={4}>
                      <form action={updatePalletItem} className="flex items-center gap-4">
                        <input type="hidden" name="product_id" value={product.id} />
                        <span className="font-medium flex-1">{product.title}</span>
                        <span className="text-muted-foreground w-40">{getProductPackLabel(product) ?? 'N/A'}</span>
                        <Input className="w-20 h-8 text-right text-xs" name="quantity" type="number" min="0" defaultValue={item?.quantity ?? 0} />
                        <Button size="sm" type="submit" variant="ghost" className="h-8 px-2 text-xs">Save</Button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
