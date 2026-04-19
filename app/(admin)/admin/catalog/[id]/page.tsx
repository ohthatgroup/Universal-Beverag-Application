import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatStructuredPack, normalizePackUom, PACK_UOM_OPTIONS } from '@/lib/utils'

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

export default async function CatalogItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const [{ rows: productRows }, { rows: brands }] = await Promise.all([
    db.query<{
      id: string
      brand_id: string | null
      title: string
      pack_details: string | null
      pack_count: number | null
      size_value: number | null
      size_uom: string | null
      price: number
      image_url: string | null
      tags: string[] | null
      is_new: boolean | null
      is_discontinued: boolean | null
    }>(
      `select id, brand_id, title, pack_details, pack_count, size_value, size_uom, price, image_url, tags, is_new, is_discontinued
       from products
       where id = $1 and customer_id is null
       limit 1`,
      [id]
    ),
    db.query<{ id: string; name: string }>('select id, name from brands order by sort_order asc'),
  ])
  const product = productRows[0] ?? null
  if (!product) notFound()

  const normalizedProductSizeUnit = product.size_uom ? normalizePackUom(product.size_uom) : null
  const sizeUnitOptions = normalizedProductSizeUnit
    ? [normalizedProductSizeUnit, ...PACK_UOM_OPTIONS.filter((unit) => unit !== normalizedProductSizeUnit)]
    : [...PACK_UOM_OPTIONS]

  async function updateProduct(formData: FormData) {
    'use server'

    const actionDb = await getRequestDb()
    const price = Number((formData.get('price') as string) || 0)
    const packDetailsInput = (formData.get('pack_details') as string).trim()
    const packCount = parseOptionalPositiveInteger((formData.get('pack_count') as string) || '')
    const sizeValue = parseOptionalPositiveNumber((formData.get('size_value') as string) || '')
    const sizeUomInput = (formData.get('size_uom') as string).trim()
    const sizeUom = sizeUomInput ? normalizePackUom(sizeUomInput) : null

    if (!Number.isFinite(price) || price < 0) {
      throw new Error('Price must be a valid non-negative number')
    }

    const hasStructuredInput = packCount !== null || sizeValue !== null || sizeUom !== null
    if (hasStructuredInput && (packCount === null || sizeValue === null || sizeUom === null)) {
      throw new Error('Pack count, size value, and unit must all be set together')
    }

    const inferredPackDetails =
      packCount !== null && sizeValue !== null && sizeUom
        ? formatStructuredPack(packCount, sizeValue, sizeUom)
        : null
    const packDetails = packDetailsInput || inferredPackDetails || null

    await actionDb.query(
      `update products
       set brand_id = $2,
           title = $3,
           pack_details = $4,
           pack_count = $5,
           size_value = $6,
           size_uom = $7,
           price = $8,
           image_url = $9,
           tags = $10,
           is_new = $11,
           is_discontinued = $12,
           updated_at = now()
       where id = $1 and customer_id is null`,
      [
        id,
        (formData.get('brand_id') as string) || null,
        (formData.get('title') as string).trim(),
        packDetails,
        packCount,
        sizeValue,
        sizeUom,
        price,
        (formData.get('image_url') as string) || null,
        ((formData.get('tags') as string) || '')
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        formData.get('is_new') === 'on',
        formData.get('is_discontinued') === 'on',
      ]
    )
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

      {/*
        Grouped into Identity / Pack / Commercial per st-9 admin design theory.
        Save button sticks to the bottom on mobile so tall forms don't force a
        scroll-to-save. Engineer TODO: convert to per-group autosave (debounced
        PATCH) so the Save button can be removed — see
        docs/st-9-engineer-followups.md.
      */}
      <form action={updateProduct} className="space-y-6 max-w-2xl pb-24 md:pb-4">
        {/* Identity — primary */}
        <fieldset className="space-y-3 rounded-lg border bg-card p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identity</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand_id">Brand</Label>
              <select id="brand_id" name="brand_id" className="h-9 w-full rounded-md border bg-background px-3 text-sm" defaultValue={product.brand_id ?? ''}>
                <option value="">No brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Flavor / Details</Label>
              <Input id="title" name="title" defaultValue={product.title} required />
            </div>
            <div className="md:col-span-2">
              <ImageUploadField name="image_url" label="Image" folder="products" defaultValue={product.image_url} />
            </div>
          </div>
        </fieldset>

        {/* Pack — secondary */}
        <fieldset className="space-y-3 rounded-lg border bg-card p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pack</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pack_details">Pack details</Label>
              <Input id="pack_details" name="pack_details" defaultValue={product.pack_details ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack_count">Pack count</Label>
              <Input
                id="pack_count"
                name="pack_count"
                type="number"
                min="1"
                step="1"
                defaultValue={product.pack_count ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size_value">Size value</Label>
              <Input
                id="size_value"
                name="size_value"
                type="number"
                min="0"
                step="0.001"
                defaultValue={product.size_value ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size_uom">Size unit</Label>
              <select
                id="size_uom"
                name="size_uom"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue={normalizedProductSizeUnit ?? ''}
              >
                <option value="">Select unit</option>
                {sizeUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Commercial — price, tags, lifecycle flags */}
        <fieldset className="space-y-3 rounded-lg border bg-card p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Commercial</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" type="number" step="0.01" defaultValue={product.price ?? 0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" name="tags" defaultValue={(product.tags ?? []).join(', ')} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_new" defaultChecked={product.is_new ?? false} className="h-4 w-4" />
              New item
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>Discontinued</span>
              <span className="relative inline-flex h-5 w-9 items-center">
                <input type="checkbox" name="is_discontinued" defaultChecked={product.is_discontinued ?? false} className="peer sr-only" />
                <span className="h-5 w-9 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                <span className="absolute left-[2px] h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
          </div>
        </fieldset>

        {/* Sticky save on mobile; inline on desktop */}
        <div className="fixed inset-x-0 bottom-16 z-20 border-t bg-background/95 p-3 backdrop-blur md:static md:inset-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="mx-auto max-w-2xl">
            <Button type="submit" className="w-full md:w-auto">Save Product</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
