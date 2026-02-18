import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency } from '@/lib/utils'

interface CustomerProductsPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    q?: string
    brand?: string
  }>
}

export default async function CustomerProductsPage({ params, searchParams }: CustomerProductsPageProps) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()
  const selectedBrandParam = (resolvedSearchParams?.brand ?? '').trim()
  const selectedBrandId = selectedBrandParam === 'all' ? '' : selectedBrandParam

  const [{ data: customer }, { data: products, error: productsError }, { data: overrides }, { data: brands }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id,business_name,contact_name,custom_pricing')
        .eq('id', id)
        .eq('role', 'customer')
        .maybeSingle(),
      supabase
        .from('products')
        .select('id,title,pack_details,price,brand_id,is_discontinued')
        .eq('is_discontinued', false)
        .order('title', { ascending: true }),
      supabase
        .from('customer_products')
        .select('product_id,excluded,custom_price')
        .eq('customer_id', id),
      supabase.from('brands').select('id,name').order('sort_order', { ascending: true }),
    ])

  if (productsError) {
    throw productsError
  }

  if (!customer) {
    notFound()
  }

  const overrideByProductId = new Map((overrides ?? []).map((entry) => [entry.product_id, entry] as const))
  const brandById = new Map((brands ?? []).map((brand) => [brand.id, brand.name] as const))

  const filteredProducts = (products ?? []).filter((product) => {
    if (selectedBrandId && product.brand_id !== selectedBrandId) {
      return false
    }

    if (!searchTerm) {
      return true
    }

    const haystack = [
      product.title ?? '',
      product.pack_details ?? '',
      product.brand_id ? brandById.get(product.brand_id) ?? '' : '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchTerm)
  })

  const groups = new Map<string, typeof filteredProducts>()
  for (const product of filteredProducts) {
    const key = product.brand_id ?? 'unbranded'
    const bucket = groups.get(key)
    if (bucket) {
      bucket.push(product)
    } else {
      groups.set(key, [product])
    }
  }

  const groupedProducts = Array.from(groups.entries()).map(([brandId, list]) => ({
    brandId,
    label: brandId === 'unbranded' ? 'Other Products' : brandById.get(brandId) ?? 'Other Products',
    products: list,
  }))

  async function updateProductSetting(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])
    const productId = String(formData.get('product_id') ?? '').trim()
    const included = formData.get('included') === 'on'
    const customPriceRaw = String(formData.get('custom_price') ?? '').trim()
    const customPrice = customPriceRaw.length > 0 ? Number(customPriceRaw) : null
    const excluded = !included

    if (!productId) {
      throw new Error('Missing product id')
    }

    if (Number.isNaN(customPrice)) {
      throw new Error('Invalid custom price')
    }

    const supabaseClient = await createClient()

    if (!excluded && customPrice === null) {
      const { error } = await supabaseClient
        .from('customer_products')
        .delete()
        .eq('customer_id', id)
        .eq('product_id', productId)

      if (error) throw error
      redirect(`/admin/customers/${id}/products`)
    }

    const { error } = await supabaseClient.from('customer_products').upsert(
      {
        customer_id: id,
        product_id: productId,
        excluded,
        custom_price: customPrice,
      },
      {
        onConflict: 'customer_id,product_id',
      }
    )

    if (error) {
      throw error
    }

    redirect(`/admin/customers/${id}/products`)
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customer Product Manager</h1>
        <Link className="text-sm underline" href={`/admin/customers/${id}`}>
          Back to customer
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        {customer.business_name || customer.contact_name} • custom_pricing={String(customer.custom_pricing)}
      </p>

      <Card>
        <CardContent className="pt-4">
          <form method="GET" className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input name="q" placeholder="Search products..." defaultValue={searchQuery} />
            <select
              name="brand"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              defaultValue={selectedBrandId || 'all'}
            >
              <option value="all">All brands</option>
              {(brands ?? []).map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {groupedProducts.map((group) => (
          <section key={group.brandId} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{group.label}</h2>
            {group.products.map((product) => {
              const override = overrideByProductId.get(product.id)
              const included = !(override?.excluded ?? false)
              const customPrice = override?.custom_price ?? null

              return (
                <Card key={product.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{product.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={updateProductSetting} className="space-y-3">
                      <input type="hidden" name="product_id" value={product.id} />

                      <div className="text-xs text-muted-foreground">
                        {product.pack_details ?? 'N/A'} • Default {formatCurrency(product.price)}
                      </div>

                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="included" defaultChecked={included} />
                        Include product for this customer
                      </label>

                      <div className="space-y-2">
                        <Label htmlFor={`custom-price-${product.id}`}>Custom price</Label>
                        <Input
                          id={`custom-price-${product.id}`}
                          name="custom_price"
                          defaultValue={customPrice !== null ? String(customPrice) : ''}
                          placeholder="Leave blank to use default"
                        />
                      </div>

                      <Button type="submit" size="sm">
                        Save
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )
            })}
          </section>
        ))}

        {groupedProducts.length === 0 && <p className="text-sm text-muted-foreground">No products found for current filters.</p>}
      </div>
    </div>
  )
}
