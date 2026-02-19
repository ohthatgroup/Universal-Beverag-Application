import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { cn, formatCurrency, getProductPackLabel } from '@/lib/utils'

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
        .select('id,title,pack_details,pack_count,size_value,size_uom,price,brand_id,is_discontinued')
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

  const customerName = customer.business_name || customer.contact_name || 'Customer'
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
      getProductPackLabel(product) ?? '',
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/admin/customers/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          {customerName}
        </Link>
        <h1 className="text-2xl font-semibold">Products</h1>
        {customer.custom_pricing && (
          <p className="text-sm text-muted-foreground mt-1">Custom pricing enabled</p>
        )}
      </div>

      {/* Search + brand filter — no Card wrapper */}
      <form method="GET" className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" placeholder="Search products..." defaultValue={searchQuery} className="pl-9" />
        </div>
        <select
          name="brand"
          className="h-9 rounded-md border bg-background px-3 text-sm md:w-44"
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

      {/* Products grouped by brand */}
      {groupedProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products found.</p>
      ) : (
        <div className="space-y-6">
          {groupedProducts.map((group) => (
            <section key={group.brandId} className="space-y-1">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {group.label}
              </h2>

              {/* Mobile: list */}
              <div className="md:hidden">
                {group.products.map((product) => {
                  const override = overrideByProductId.get(product.id)
                  const included = !(override?.excluded ?? false)
                  const customPrice = override?.custom_price ?? null

                  return (
                    <form key={product.id} action={updateProductSetting} className={cn('border-b py-3 last:border-0', !included && 'opacity-50')}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <div className="flex items-start gap-3">
                        <input type="checkbox" name="included" defaultChecked={included} className="mt-1 h-4 w-4" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{product.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {getProductPackLabel(product) ?? 'N/A'} · {formatCurrency(product.price)}
                          </div>
                          {customer.custom_pricing && (
                            <Input
                              name="custom_price"
                              defaultValue={customPrice !== null ? String(customPrice) : ''}
                              placeholder="Custom price"
                              className="mt-1.5 h-8 text-xs"
                            />
                          )}
                        </div>
                        <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                          Save
                        </Button>
                      </div>
                    </form>
                  )
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium w-10"></th>
                      <th className="px-4 py-2 text-left font-medium">Product</th>
                      <th className="px-4 py-2 text-left font-medium">Pack</th>
                      <th className="px-4 py-2 text-right font-medium">Default Price</th>
                      {customer.custom_pricing && (
                        <th className="px-4 py-2 text-right font-medium">Custom Price</th>
                      )}
                      <th className="px-4 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.products.map((product) => {
                      const override = overrideByProductId.get(product.id)
                      const included = !(override?.excluded ?? false)
                      const customPrice = override?.custom_price ?? null

                      return (
                        <tr key={product.id} className={cn('border-b last:border-0', !included && 'opacity-50')}>
                          <td className="px-4 py-2" colSpan={customer.custom_pricing ? 6 : 5}>
                            <form action={updateProductSetting} className="flex items-center gap-4">
                              <input type="hidden" name="product_id" value={product.id} />
                              <input type="checkbox" name="included" defaultChecked={included} className="h-4 w-4" />
                              <span className="font-medium flex-1">{product.title}</span>
                              <span className="text-muted-foreground w-32">{getProductPackLabel(product) ?? 'N/A'}</span>
                              <span className="text-right w-24">{formatCurrency(product.price)}</span>
                              {customer.custom_pricing && (
                                <Input
                                  name="custom_price"
                                  defaultValue={customPrice !== null ? String(customPrice) : ''}
                                  placeholder="—"
                                  className="h-8 w-24 text-right text-xs"
                                />
                              )}
                              <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                Save
                              </Button>
                            </form>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
