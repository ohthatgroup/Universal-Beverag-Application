import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function CatalogItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const supabase = await createClient()

  const [{ data: product, error: productError }, { data: brands, error: brandsError }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase.from('brands').select('id,name').order('sort_order', { ascending: true }),
  ])

  if (productError) throw productError
  if (brandsError) throw brandsError
  if (!product) notFound()

  async function updateProduct(formData: FormData) {
    'use server'

    const supabaseClient = await createClient()
    const price = Number((formData.get('price') as string) || 0)
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('Price must be a valid non-negative number')
    }

    const { error } = await supabaseClient
      .from('products')
      .update({
        brand_id: (formData.get('brand_id') as string) || null,
        title: (formData.get('title') as string).trim(),
        pack_details: (formData.get('pack_details') as string) || null,
        price,
        image_url: (formData.get('image_url') as string) || null,
        tags: ((formData.get('tags') as string) || '')
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        is_new: formData.get('is_new') === 'on',
        is_discontinued: formData.get('is_discontinued') === 'on',
        sort_order: Number((formData.get('sort_order') as string) || 0),
      })
      .eq('id', id)

    if (error) throw error
    redirect(`/admin/catalog/${id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Catalog
        </Link>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
      </div>

      <form action={updateProduct} className="space-y-4 max-w-2xl">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brand_id">Brand</Label>
            <select id="brand_id" name="brand_id" className="h-9 w-full rounded-md border bg-background px-3 text-sm" defaultValue={product.brand_id ?? ''}>
              <option value="">No brand</option>
              {(brands ?? []).map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={product.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pack_details">Pack details</Label>
            <Input id="pack_details" name="pack_details" defaultValue={product.pack_details ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" step="0.01" defaultValue={product.price ?? 0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort order</Label>
            <Input id="sort_order" name="sort_order" type="number" defaultValue={product.sort_order ?? 0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" name="image_url" defaultValue={product.image_url ?? ''} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input id="tags" name="tags" defaultValue={(product.tags ?? []).join(', ')} />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_new" defaultChecked={product.is_new ?? false} className="h-4 w-4" />
            New item
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_discontinued" defaultChecked={product.is_discontinued ?? false} className="h-4 w-4" />
            Discontinued
          </label>
        </div>

        <Button type="submit">Save Product</Button>
      </form>
    </div>
  )
}
