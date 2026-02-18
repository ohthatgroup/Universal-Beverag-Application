import { notFound } from 'next/navigation'
import { OrderBuilder } from '@/components/catalog/order-builder'
import { CustomerOrderReadonly } from '@/components/orders/customer-order-readonly'
import { requirePageAuth } from '@/lib/server/page-auth'
import type { Brand, CatalogProduct, CustomerProduct, OrderStatus, PalletDeal, Product } from '@/lib/types'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function CustomerOrderLinkPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!uuidRegex.test(id)) {
    notFound()
  }

  const context = await requirePageAuth(['customer'])

  const { data: order, error: orderError } = await context.supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', context.userId)
    .maybeSingle()

  if (orderError) {
    throw orderError
  }

  if (!order) {
    notFound()
  }

  if (order.status !== 'draft') {
    const { data: itemRows, error: itemError } = await context.supabase
      .from('order_items')
      .select('id,product_id,pallet_deal_id,quantity,unit_price,line_total')
      .eq('order_id', order.id)
      .gt('quantity', 0)
      .order('id', { ascending: true })

    if (itemError) {
      throw itemError
    }

    const orderItems = itemRows ?? []
    const productIds = orderItems
      .map((item) => item.product_id)
      .filter((value): value is string => Boolean(value))
    const palletIds = orderItems
      .map((item) => item.pallet_deal_id)
      .filter((value): value is string => Boolean(value))

    const [{ data: products, error: productsError }, { data: pallets, error: palletsError }] =
      await Promise.all([
        productIds.length
          ? context.supabase
              .from('products')
              .select('id,title,pack_details')
              .in('id', productIds)
          : Promise.resolve({ data: [], error: null }),
        palletIds.length
          ? context.supabase
              .from('pallet_deals')
              .select('id,title,description')
              .in('id', palletIds)
          : Promise.resolve({ data: [], error: null }),
      ])

    if (productsError) {
      throw productsError
    }

    if (palletsError) {
      throw palletsError
    }

    const productById = new Map((products ?? []).map((product) => [product.id, product] as const))
    const palletById = new Map((pallets ?? []).map((pallet) => [pallet.id, pallet] as const))

    const items = orderItems.map((item) => {
      const product = item.product_id ? productById.get(item.product_id) : null
      const pallet = item.pallet_deal_id ? palletById.get(item.pallet_deal_id) : null
      return {
        id: item.id,
        title: product?.title ?? pallet?.title ?? 'Unknown item',
        details: product?.pack_details ?? pallet?.description ?? '',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price ?? 0),
        lineTotal: Number(item.line_total ?? 0),
      }
    })

    return (
      <CustomerOrderReadonly
        order={{
          id: order.id,
          delivery_date: order.delivery_date,
          status: asOrderStatus(order.status),
          item_count: order.item_count ?? 0,
          total: Number(order.total ?? 0),
          submitted_at: order.submitted_at,
          delivered_at: order.delivered_at,
        }}
        items={items}
        showPrices={context.profile.show_prices}
      />
    )
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
      deliveryDate={order.delivery_date}
      products={catalogProducts}
      palletDeals={palletDeals}
      showPrices={context.profile.show_prices}
      defaultGroupBy={context.profile.default_group}
      initialItems={orderItemsResponse.data ?? []}
    />
  )
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'draft'
}
