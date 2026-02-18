import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function CatalogPage() {
  await requirePageAuth(['salesman'])
  const supabase = await createClient()

  const [{ data: products, error: productsError }, { data: brands, error: brandsError }] = await Promise.all([
    supabase
      .from('products')
      .select('id,title,pack_details,price,is_new,is_discontinued,sort_order,brand_id')
      .order('sort_order', { ascending: true }),
    supabase.from('brands').select('id,name').order('sort_order', { ascending: true }),
  ])

  if (productsError) throw productsError
  if (brandsError) throw brandsError

  const brandById = new Map((brands ?? []).map((brand) => [brand.id, brand.name]))

  async function createProduct(formData: FormData) {
    'use server'

    const brandId = (formData.get('brand_id') as string) || null
    const title = (formData.get('title') as string).trim()
    const packDetails = (formData.get('pack_details') as string).trim()
    const price = Number((formData.get('price') as string) || 0)

    if (!title) {
      throw new Error('Title is required')
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Price must be greater than zero')
    }

    const supabaseClient = await createClient()
    const { error } = await supabaseClient.from('products').insert({
      brand_id: brandId,
      title,
      pack_details: packDetails || null,
      price,
      is_new: formData.get('is_new') === 'on',
      is_discontinued: false,
    })

    if (error) throw error
    redirect('/admin/catalog')
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catalog</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link className="underline" href="/admin/brands">
            Brands
          </Link>
          <Link className="underline" href="/admin/catalog/pallets">
            Pallet Deals
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProduct} className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="brand_id">Brand</Label>
              <select
                id="brand_id"
                name="brand_id"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">No brand</option>
                {(brands ?? []).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pack_details">Pack details</Label>
              <Input id="pack_details" name="pack_details" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" type="number" step="0.01" min="0" required />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_new" />
              Mark as new item
            </label>

            <Button type="submit">Create Product</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(products ?? []).map((product) => (
            <div key={product.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{product.title}</div>
              <div className="text-xs text-muted-foreground">
                {brandById.get(product.brand_id ?? '') ?? 'No brand'} • {product.pack_details ?? 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">
                ${Number(product.price).toFixed(2)} • new={String(product.is_new)} • discontinued={String(product.is_discontinued)}
              </div>
              <Link className="text-xs underline" href={`/admin/catalog/${product.id}`}>
                Edit product
              </Link>
            </div>
          ))}
          {(products ?? []).length === 0 && <p className="text-sm text-muted-foreground">No products available.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
