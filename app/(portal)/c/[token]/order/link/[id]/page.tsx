import { notFound } from 'next/navigation'
import { OrderBuilder } from '@/components/catalog/order-builder'
import { CustomerOrderReadonly } from '@/components/orders/customer-order-readonly'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Brand, CatalogProduct, CustomerProduct, OrderStatus, PalletDeal, Product } from '@/lib/types'
import { getProductPackLabel } from '@/lib/utils'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PortalOrderLinkPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>
}) {
  const { token, id } = await params

  if (!uuidRegex.test(id)) {
    notFound()
  }

  const { customerId, profile } = await resolveCustomerToken(token)
  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', customerId)
    .maybeSingle()

  if (orderError) {
    throw orderError
  }

  if (!order) {
    notFound()
  }

  if (order.status !== 'draft') {
    const { data: itemRows, error: itemError } = await admin
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
          ? admin.from('products').select('id,title,pack_details,pack_count,size_value,size_uom').in('id', productIds)
          : Promise.resolve({ data: [], error: null }),
        palletIds.length
          ? admin.from('pallet_deals').select('id,title,description').in('id', palletIds)
          : Promise.resolve({ data: [], error: null }),
      ])

    if (productsError) throw productsError
    if (palletsError) throw palletsError

    const productById = new Map((products ?? []).map((product) => [product.id, product] as const))
    const palletById = new Map((pallets ?? []).map((pallet) => [pallet.id, pallet] as const))

    const items = orderItems.map((item) => {
      const product = item.product_id ? productById.get(item.product_id) : null
      const pallet = item.pallet_deal_id ? palletById.get(item.pallet_deal_id) : null
      return {
        id: item.id,
        title: product?.title ?? pallet?.title ?? 'Unknown item',
        details: (product ? getProductPackLabel(product) : null) ?? pallet?.description ?? '',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price ?? 0),
        lineTotal: Number(item.line_total ?? 0),
      }
    })

    return (
      <CustomerOrderReadonly
        token={token}
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
        showPrices={profile.show_prices}
      />
    )
  }

  // Draft order — show order builder
  const [productsResponse, brandsResponse, customerProductsResponse, palletDealsResponse, orderItemsResponse] =
    await Promise.all([
      admin
        .from('products')
        .select('*')
        .eq('is_discontinued', false)
        .order('sort_order', { ascending: true }),
      admin.from('brands').select('*').order('sort_order', { ascending: true }),
      admin
        .from('customer_products')
        .select('*')
        .eq('customer_id', customerId),
      admin
        .from('pallet_deals')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      admin
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

  const allProducts = (productsResponse.data ?? []) as Product[]
  const brands = (brandsResponse.data ?? []) as Brand[]
  const customerProducts = (customerProductsResponse.data ?? []) as CustomerProduct[]
  const palletDeals = (palletDealsResponse.data ?? []) as PalletDeal[]

  const brandById = new Map(brands.map((brand) => [brand.id, brand]))
  const customerProductById = new Map(customerProducts.map((entry) => [entry.product_id, entry]))

  const catalogProducts: CatalogProduct[] = allProducts
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
      token={token}
      orderId={order.id}
      deliveryDate={order.delivery_date}
      products={catalogProducts}
      palletDeals={palletDeals}
      showPrices={profile.show_prices}
      defaultGroupBy={profile.default_group}
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
