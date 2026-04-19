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
import { getRequestDb } from '@/lib/server/db'
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
  const db = await getRequestDb()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()
  const selectedBrandParam = (resolvedSearchParams?.brand ?? '').trim()
  const selectedBrandId = selectedBrandParam === 'all' ? '' : selectedBrandParam

  const [{ rows: customers }, { rows: products }, { rows: overrides }, { rows: brands }] =
    await Promise.all([
      db.query<{
        id: string
        business_name: string | null
        contact_name: string | null
        custom_pricing: boolean | null
      }>(
        `select id, business_name, contact_name, custom_pricing
         from profiles
         where id = $1 and role = 'customer'
         limit 1`,
        [id]
      ),
      db.query<{
        id: string
        title: string
        pack_details: string | null
        pack_count: number | null
        size_value: number | null
        size_uom: string | null
        price: number
        brand_id: string | null
        is_discontinued: boolean | null
        customer_id: string | null
        sort_order: number
      }>(
        `select id, title, pack_details, pack_count, size_value, size_uom, price, brand_id, is_discontinued, customer_id, sort_order
         from products
         where is_discontinued = false and (customer_id is null or customer_id = $1)
         order by sort_order asc, title asc`,
        [id]
      ),
      db.query<{ product_id: string; excluded: boolean | null; custom_price: number | null; is_usual: boolean | null }>(
        `select product_id, excluded, custom_price, is_usual
         from customer_products
         where customer_id = $1`,
        [id]
      ),
      db.query<{ id: string; name: string }>('select id, name from brands order by sort_order asc'),
    ])

  const customer = customers[0]
  if (!customer) {
    notFound()
  }

  const customerName = customer.business_name || customer.contact_name || 'Customer'
  const brandById = new Map(brands.map((brand) => [brand.id, brand.name] as const))

  const filteredProducts = products.filter((product) => {
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

  const brandOptions: CustomerBrandOption[] = brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
  }))

  const overridesData: CustomerProductOverrideData[] = overrides.map((override) => ({
    productId: override.product_id,
    excluded: Boolean(override.excluded),
    customPrice: override.custom_price ?? null,
    isUsual: Boolean(override.is_usual),
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
