import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  CustomerProductsManager,
  type CustomerBrandOption,
  type CustomerProductGroupData,
  type CustomerProductOverrideData,
  type CustomerProductRowData,
} from '@/components/admin/customer-products-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { LiveQuerySelect } from '@/components/admin/live-query-select'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { getProductPackLabel } from '@/lib/utils'

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
        .select('id,title,pack_details,pack_count,size_value,size_uom,price,brand_id,is_discontinued,customer_id,sort_order')
        .eq('is_discontinued', false)
        .or(`customer_id.is.null,customer_id.eq.${id}`)
        .order('sort_order', { ascending: true })
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

  const groups = new Map<string, CustomerProductRowData[]>()
  for (const product of filteredProducts) {
    const groupId = product.brand_id ?? 'unbranded'
    const bucket = groups.get(groupId)
    const row: CustomerProductRowData = {
      id: product.id,
      title: product.title,
      brandId: product.brand_id,
      brandLabel: product.brand_id ? brandById.get(product.brand_id) ?? 'No brand' : 'No brand',
      packLabel: getProductPackLabel(product) ?? 'N/A',
      price: Number(product.price ?? 0),
      isCustom: product.customer_id === id,
    }

    if (bucket) {
      bucket.push(row)
    } else {
      groups.set(groupId, [row])
    }
  }

  const groupedProducts: CustomerProductGroupData[] = Array.from(groups.entries()).map(([brandId, list]) => ({
    brandId,
    label: brandId === 'unbranded' ? 'Other Products' : brandById.get(brandId) ?? 'Other Products',
    products: list,
  }))

  const brandOptions: CustomerBrandOption[] = (brands ?? []).map((brand) => ({
    id: brand.id,
    name: brand.name,
  }))

  const overridesData: CustomerProductOverrideData[] = (overrides ?? []).map((override) => ({
    productId: override.product_id,
    excluded: Boolean(override.excluded),
    customPrice: override.custom_price ?? null,
  }))

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

      <CustomerProductsManager
        customerId={id}
        customPricing={Boolean(customer.custom_pricing)}
        groups={groupedProducts}
        brands={brandOptions}
        overrides={overridesData}
      />
    </div>
  )
}
