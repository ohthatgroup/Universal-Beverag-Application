import { notFound } from 'next/navigation'
import { OrderBuilder } from '@/components/catalog/order-builder'
import type { Brand, CatalogProduct, CustomerProduct, PalletDeal, Product } from '@/lib/types'
import { requirePageAuth } from '@/lib/server/page-auth'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export default async function OrderPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params

  if (!isoDateRegex.test(date)) {
    notFound()
  }

  const context = await requirePageAuth(['customer'])

  const { data: existingOrder } = await context.supabase
    .from('orders')
    .select('*')
    .eq('customer_id', context.userId)
    .eq('delivery_date', date)
    .eq('status', 'draft')
    .maybeSingle()

  const order =
    existingOrder ??
    (
      await context.supabase
        .from('orders')
        .insert({
          customer_id: context.userId,
          delivery_date: date,
          status: 'draft',
        })
        .select('*')
        .single()
    ).data

  if (!order) {
    throw new Error('Unable to load or create draft order')
  }

  const [productsResponse, brandsResponse, customerProductsResponse, palletDealsResponse, orderItemsResponse] =
    await Promise.all([
      context.supabase
        .from('products')
        .select('*')
        .eq('is_discontinued', false)
        .order('sort_order', { ascending: true }),
      context.supabase.from('brands').select('*').order('sort_order', { ascending: true }),
      context.supabase
        .from('customer_products')
        .select('*')
        .eq('customer_id', context.userId),
      context.supabase
        .from('pallet_deals')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      context.supabase
        .from('order_items')
        .select('product_id,pallet_deal_id,quantity,unit_price')
        .eq('order_id', order.id)
        .gt('quantity', 0),
    ])

  if (productsResponse.error) throw productsResponse.error
  if (brandsResponse.error) throw brandsResponse.error
  if (customerProductsResponse.error) throw customerProductsResponse.error
  if (palletDealsResponse.error) throw palletDealsResponse.error
  if (orderItemsResponse.error) throw orderItemsResponse.error

  const products = (productsResponse.data ?? []) as Product[]
  const brands = (brandsResponse.data ?? []) as Brand[]
  const customerProducts = (customerProductsResponse.data ?? []) as CustomerProduct[]
  const palletDeals = (palletDealsResponse.data ?? []) as PalletDeal[]

  const brandById = new Map(brands.map((brand) => [brand.id, brand]))
  const customerProductById = new Map(customerProducts.map((entry) => [entry.product_id, entry]))

  const catalogProducts: CatalogProduct[] = products
    .filter((product) => !customerProductById.get(product.id)?.excluded)
    .map((product) => {
      const customerProduct = customerProductById.get(product.id)
      const customPrice = customerProduct?.custom_price ?? null
      return {
        ...product,
        custom_price: customPrice,
        brand: product.brand_id ? brandById.get(product.brand_id) : undefined,
        effective_price: customPrice ?? product.price,
      }
    })

  return (
    <OrderBuilder
      orderId={order.id}
      deliveryDate={date}
      products={catalogProducts}
      palletDeals={palletDeals}
      showPrices={context.profile.show_prices}
      defaultGroupBy={context.profile.default_group}
      initialItems={orderItemsResponse.data ?? []}
    />
  )
}
