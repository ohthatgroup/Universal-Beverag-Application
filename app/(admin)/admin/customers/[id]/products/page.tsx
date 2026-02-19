import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { LiveQuerySelect } from '@/components/admin/live-query-select'
import { ProductPickerDialog } from '@/components/admin/product-picker-dialog'
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
  const getProductTitleWithBrand = (product: { title: string; brand_id: string | null }) => {
    const brandLabel = product.brand_id ? brandById.get(product.brand_id) ?? '' : ''
    return brandLabel ? `${brandLabel} - ${product.title}` : product.title
  }

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

  const pickerProducts = (products ?? []).map((product) => ({
    id: product.id,
    title: getProductTitleWithBrand(product),
    brandLabel: product.brand_id ? brandById.get(product.brand_id) ?? 'No brand' : 'No brand',
    packLabel: getProductPackLabel(product) ?? 'N/A',
    price: Number(product.price ?? 0),
  }))

  async function updateProductSetting(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])
    const productId = String(formData.get('product_id') ?? '').trim()
    const hidden = formData.get('hidden') === 'on'
    const customPriceRaw = String(formData.get('custom_price') ?? '').trim()
    const customPrice = customPriceRaw.length > 0 ? Number(customPriceRaw) : null

    if (!productId) {
      throw new Error('Missing product id')
    }

    if (Number.isNaN(customPrice)) {
      throw new Error('Invalid custom price')
    }

    const supabaseClient = await createClient()

    if (!hidden && customPrice === null) {
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
        excluded: hidden,
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
      <div>
        <Link href={`/admin/customers/${id}`} className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {customerName}
        </Link>
        <h1 className="text-2xl font-semibold">Products by Brand</h1>
        {customer.custom_pricing && (
          <p className="mt-1 text-sm text-muted-foreground">Custom pricing enabled</p>
        )}
      </div>

      <div className="space-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0">
        <div className="flex items-center gap-2">
          <ProductPickerDialog
            mode="customer"
            endpoint={`/api/customers/${id}/products`}
            title="Add Product to Custom Catalog"
            triggerLabel="Add Product"
            products={pickerProducts}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <LiveQueryInput
            placeholder="Search products..."
            initialValue={searchQuery}
            className="w-full sm:w-80"
          />
          <LiveQuerySelect
            paramKey="brand"
            initialValue={selectedBrandId || 'all'}
            className="w-full sm:w-48"
            options={[
              { value: 'all', label: 'All brands' },
              ...(brands ?? []).map((brand) => ({ value: brand.id, label: brand.name })),
            ]}
          />
        </div>
      </div>

      {groupedProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products found.</p>
      ) : (
        <div className="space-y-6">
          {groupedProducts.map((group) => (
            <section key={group.brandId} className="space-y-1">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>

              <div className="md:hidden">
                {group.products.map((product) => {
                  const override = overrideByProductId.get(product.id)
                  const hidden = override?.excluded ?? false
                  const customPrice = override?.custom_price ?? null

                  return (
                    <form key={product.id} action={updateProductSetting} className={cn('border-b py-3 last:border-0', hidden && 'opacity-50')}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{getProductTitleWithBrand(product)}</div>
                          <div className="text-xs text-muted-foreground">
                            {getProductPackLabel(product) ?? 'N/A'} - {formatCurrency(product.price)}
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

                        <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
                          <input type="checkbox" name="hidden" defaultChecked={hidden} className="peer sr-only" />
                          <span className="h-5 w-9 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                          <span className="absolute left-[2px] h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
                        </label>

                        <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                          Save
                        </Button>
                      </div>
                    </form>
                  )
                })}
              </div>

              <div className="hidden rounded-lg border md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Product</th>
                      <th className="px-4 py-2 text-left font-medium">Pack</th>
                      <th className="px-4 py-2 text-right font-medium">Default Price</th>
                      {customer.custom_pricing && (
                        <th className="px-4 py-2 text-right font-medium">Custom Price</th>
                      )}
                      <th className="px-4 py-2 text-center font-medium">Hide</th>
                      <th className="px-4 py-2 text-right font-medium">Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.products.map((product) => {
                      const override = overrideByProductId.get(product.id)
                      const hidden = override?.excluded ?? false
                      const customPrice = override?.custom_price ?? null
                      const formId = `product-row-${product.id}`

                      return (
                        <tr key={product.id} className={cn('border-b last:border-0', hidden && 'opacity-50')}>
                          <td className="px-4 py-2 font-medium">
                            <form id={formId} action={updateProductSetting} className="hidden">
                              <input type="hidden" name="product_id" value={product.id} />
                              {!customer.custom_pricing && <input type="hidden" name="custom_price" value="" />}
                            </form>
                            {getProductTitleWithBrand(product)}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{getProductPackLabel(product) ?? 'N/A'}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(product.price)}</td>
                          {customer.custom_pricing ? (
                            <td className="px-4 py-2 text-right">
                              <Input
                                form={formId}
                                name="custom_price"
                                defaultValue={customPrice !== null ? String(customPrice) : ''}
                                placeholder="-"
                                className="ml-auto h-8 w-28 text-right text-xs"
                              />
                            </td>
                          ) : null}
                          <td className="px-4 py-2 text-center">
                            <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
                              <input form={formId} type="checkbox" name="hidden" defaultChecked={hidden} className="peer sr-only" />
                              <span className="h-5 w-9 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                              <span className="absolute left-[2px] h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
                            </label>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button form={formId} type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                              Save
                            </Button>
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
