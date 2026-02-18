import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency } from '@/lib/utils'

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

  const productList = products ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catalog</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/admin/brands" className="text-muted-foreground hover:text-foreground hover:underline">
            Brands
          </Link>
          <Link href="/admin/catalog/pallets" className="text-muted-foreground hover:text-foreground hover:underline">
            Pallets
          </Link>
        </div>
      </div>

      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-medium text-sm">
          <Plus className="h-4 w-4" />
          New Product
        </summary>
        <div className="border-t p-4">
          <form action={createProduct} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand_id">Brand</Label>
              <select
                id="brand_id"
                name="brand_id"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">No brand</option>
                {(brands ?? []).map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
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
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="is_new" className="h-4 w-4" />
              Mark as new item
            </label>
            <Button type="submit" className="md:col-span-2">Create Product</Button>
          </form>
        </div>
      </details>

      {productList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products available.</p>
      ) : (
        <>
          <div className="space-y-0 md:hidden">
            {productList.map((product) => (
              <Link key={product.id} href={`/admin/catalog/${product.id}`} className="flex items-center justify-between border-b py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{product.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {brandById.get(product.brand_id ?? '') ?? 'No brand'} · {product.pack_details ?? 'N/A'}
                  </div>
                </div>
                <div className="ml-3 text-sm">
                  {formatCurrency(product.price)}
                  {product.is_new && <span className="ml-1.5 text-xs text-primary">New</span>}
                  {product.is_discontinued && <span className="ml-1.5 text-xs text-muted-foreground line-through">Disc.</span>}
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden md:block rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Brand</th>
                  <th className="px-4 py-3 text-left font-medium">Pack</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {productList.map((product) => (
                  <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/catalog/${product.id}`} className="font-medium hover:underline">{product.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{brandById.get(product.brand_id ?? '') ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.pack_details ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-3">
                      {product.is_new && <span className="text-primary text-xs">New</span>}
                      {product.is_discontinued && <span className="text-muted-foreground text-xs line-through">Discontinued</span>}
                      {!product.is_new && !product.is_discontinued && <span className="text-muted-foreground text-xs">Active</span>}
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
