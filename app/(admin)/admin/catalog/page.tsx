import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { Button } from '@/components/ui/button'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import {
  formatCurrency,
  formatStructuredPack,
  getProductPackLabel,
  isSupportedPackUom,
  normalizePackUom,
  PACK_UOM_OPTIONS,
} from '@/lib/utils'

function parseOptionalPositiveInteger(raw: string): number | null {
  const value = raw.trim()
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Pack count must be a positive whole number')
  }
  return parsed
}

function parseOptionalPositiveNumber(raw: string): number | null {
  const value = raw.trim()
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Size value must be a positive number')
  }
  return parsed
}

interface CatalogPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  await requirePageAuth(['salesman'])
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const [{ data: products, error: productsError }, { data: brands, error: brandsError }] = await Promise.all([
    supabase
      .from('products')
      .select('id,title,pack_details,pack_count,size_value,size_uom,price,image_url,is_new,is_discontinued,sort_order,brand_id')
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
    const packDetailsInput = (formData.get('pack_details') as string).trim()
    const packCount = parseOptionalPositiveInteger((formData.get('pack_count') as string) || '')
    const sizeValue = parseOptionalPositiveNumber((formData.get('size_value') as string) || '')
    const sizeUomInput = (formData.get('size_uom') as string).trim()
    const sizeUom = sizeUomInput ? normalizePackUom(sizeUomInput) : null
    const price = Number((formData.get('price') as string) || 0)

    const hasStructuredInput = packCount !== null || sizeValue !== null || sizeUom !== null
    if (hasStructuredInput && (packCount === null || sizeValue === null || sizeUom === null)) {
      throw new Error('Pack count, size value, and unit must all be set together')
    }
    if (sizeUom && !isSupportedPackUom(sizeUom)) {
      throw new Error('Unsupported unit of measure')
    }

    const inferredPackDetails =
      packCount !== null && sizeValue !== null && sizeUom
        ? formatStructuredPack(packCount, sizeValue, sizeUom)
        : null
    const packDetails = packDetailsInput || inferredPackDetails || null

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
      pack_details: packDetails,
      pack_count: packCount,
      size_value: sizeValue,
      size_uom: sizeUom,
      price,
      image_url: (formData.get('image_url') as string) || null,
      is_new: formData.get('is_new') === 'on',
      is_discontinued: false,
    })

    if (error) throw error
    redirect('/admin/catalog')
  }

  const productList = (products ?? []).filter((product) => {
    if (!searchTerm) return true

    const haystack = [
      product.title ?? '',
      getProductPackLabel(product) ?? '',
      brandById.get(product.brand_id ?? '') ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchTerm)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catalog</h1>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <details className="group rounded-md border">
          <summary className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm font-medium list-none">
            <Plus className="h-3.5 w-3.5" />
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
                <Label htmlFor="title">Flavor / Details</Label>
                <Input id="title" name="title" placeholder="COKE, DIET COKE, LEMON, etc." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack_details">Pack details</Label>
                <Input id="pack_details" name="pack_details" placeholder="Optional label, auto-built from structured fields when blank" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack_count">Pack count</Label>
                <Input id="pack_count" name="pack_count" type="number" min="1" step="1" placeholder="24" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size_value">Size value</Label>
                <Input id="size_value" name="size_value" type="number" min="0" step="0.001" placeholder="12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size_uom">Size unit</Label>
                <select
                  id="size_uom"
                  name="size_uom"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  defaultValue=""
                >
                  <option value="">Select unit</option>
                  {PACK_UOM_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0" required />
              </div>
              <ImageUploadField name="image_url" label="Image" folder="products" />
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" name="is_new" className="h-4 w-4" />
                Mark as new item
              </label>
              <Button type="submit" className="md:col-span-2">Create Product</Button>
            </form>
          </div>
        </details>

        <LiveQueryInput
          placeholder="Search products..."
          initialValue={searchQuery}
          className="w-full sm:w-80"
        />
      </div>

      {productList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products available.</p>
      ) : (
        <>
          <div className="space-y-0 md:hidden">
            {productList.map((product) => (
              <Link key={product.id} href={`/admin/catalog/${product.id}`} className="flex items-center justify-between border-b py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{product.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {brandById.get(product.brand_id ?? '') ?? 'No brand'} - {getProductPackLabel(product) ?? 'N/A'}
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

          <div className="hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Flavor / Details</th>
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
                    <td className="px-4 py-3 text-muted-foreground">{brandById.get(product.brand_id ?? '') ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{getProductPackLabel(product) ?? '-'}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-3">
                      {product.is_new && <span className="text-xs text-primary">New</span>}
                      {product.is_discontinued && <span className="text-xs text-muted-foreground line-through">Discontinued</span>}
                      {!product.is_new && !product.is_discontinued && <span className="text-xs text-muted-foreground">Active</span>}
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
