import { notFound, redirect } from 'next/navigation'
import { PalletDealContentsEditor } from '@/components/admin/pallet-deal-contents-editor'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { LiveQuerySelect } from '@/components/admin/live-query-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { getProductPackLabel } from '@/lib/utils'

interface PalletDetailPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    q?: string
    content?: string
  }>
}

export default async function PalletDetailPage({ params, searchParams }: PalletDetailPageProps) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()
  const contentParam = (resolvedSearchParams?.content ?? 'all').trim()
  const contentFilter = contentParam === 'included' || contentParam === 'excluded' ? contentParam : 'all'

  const [{ rows: palletDealRows }, { rows: products }, { rows: items }, { rows: brands }] = await Promise.all([
    db.query<{
      id: string
      title: string
      pallet_type: 'single' | 'mixed'
      image_url: string | null
      price: number
      savings_text: string | null
      description: string | null
      is_active: boolean | null
    }>(
      `select id, title, pallet_type, image_url, price, savings_text, description, is_active
       from pallet_deals
       where id = $1
       limit 1`,
      [id]
    ),
    db.query<{
      id: string
      title: string
      brand_id: string | null
      pack_details: string | null
      pack_count: number | null
      size_value: number | null
      size_uom: string | null
    }>(
      `select id, title, brand_id, pack_details, pack_count, size_value, size_uom
       from products
       where customer_id is null
       order by title asc`
    ),
    db.query<{ id: string; product_id: string | null; quantity: number }>(
      `select id, product_id, quantity
       from pallet_deal_items
       where pallet_deal_id = $1`,
      [id]
    ),
    db.query<{ id: string; name: string }>('select id, name from brands'),
  ])
  const palletDeal = palletDealRows[0] ?? null
  if (!palletDeal) notFound()

  const itemByProduct = new Map(
    (items ?? [])
      .filter((item) => Boolean(item.product_id))
      .map((item) => [item.product_id as string, item] as const)
  )
  const brandById = new Map((brands ?? []).map((brand) => [brand.id, brand.name] as const))
  const getProductTitleWithBrand = (product: { title: string; brand_id: string | null }) => {
    const brandLabel = product.brand_id ? brandById.get(product.brand_id) ?? '' : ''
    return brandLabel ? `${brandLabel} - ${product.title}` : product.title
  }

  const includedCount = (items ?? []).filter((item) => item.quantity > 0).length
  const filteredProducts = (products ?? []).filter((product) => {
    const quantity = itemByProduct.get(product.id)?.quantity ?? 0
    if (contentFilter === 'included' && quantity <= 0) return false
    if (contentFilter === 'excluded' && quantity > 0) return false
    if (!searchTerm) return true
    const haystack = [getProductTitleWithBrand(product), getProductPackLabel(product) ?? '']
      .join(' ')
      .toLowerCase()
    return haystack.includes(searchTerm)
  })

  async function updatePallet(formData: FormData) {
    'use server'

    const actionDb = await getRequestDb()
    const price = Number((formData.get('price') as string) || 0)

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Price must be greater than zero')
    }

    await actionDb.query(
      `update pallet_deals
       set title = $2,
           pallet_type = $3,
           image_url = $4,
           price = $5,
           savings_text = $6,
           description = $7,
           is_active = $8
       where id = $1`,
      [
        id,
        (formData.get('title') as string).trim(),
        (formData.get('pallet_type') as 'single' | 'mixed') || 'single',
        (formData.get('image_url') as string) || null,
        price,
        (formData.get('savings_text') as string) || null,
        (formData.get('description') as string) || null,
        formData.get('is_active') === 'on',
      ]
    )
    redirect(`/admin/catalog/pallets/${id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{palletDeal.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {palletDeal.pallet_type} - {palletDeal.is_active ? 'Active' : 'Inactive'} - {includedCount} products
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form action={updatePallet} className="min-w-0 space-y-4 rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Deal Settings</h2>

          <div className="grid gap-3 sm:grid-cols-2">
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
              <Label htmlFor="savings_text">Savings text</Label>
              <Input id="savings_text" name="savings_text" defaultValue={palletDeal.savings_text ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" defaultValue={palletDeal.description ?? ''} />
            </div>
          </div>

          <ImageUploadField name="image_url" label="Image" folder="pallets" defaultValue={palletDeal.image_url} />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={palletDeal.is_active ?? true} className="h-4 w-4" />
            Active
          </label>

          <Button type="submit">Save Deal</Button>
        </form>

        <div className="min-w-0 space-y-4 overflow-hidden rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Deal Contents</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <LiveQueryInput
              placeholder="Search deal items..."
              initialValue={searchQuery}
              className="w-full sm:w-72"
            />
            <LiveQuerySelect
              paramKey="content"
              initialValue={contentFilter}
              className="w-full sm:w-44"
              options={[
                { value: 'all', label: 'All items' },
                { value: 'included', label: 'Included' },
                { value: 'excluded', label: 'Not included' },
              ]}
            />
          </div>

          <PalletDealContentsEditor
            palletDealId={id}
            palletType={palletDeal.pallet_type === 'mixed' ? 'mixed' : 'single'}
            rows={filteredProducts.map((product) => ({
              id: product.id,
              title: getProductTitleWithBrand(product),
              packLabel: getProductPackLabel(product) ?? 'N/A',
              quantity: itemByProduct.get(product.id)?.quantity ?? 0,
            }))}
          />
        </div>
      </div>
    </div>
  )
}
