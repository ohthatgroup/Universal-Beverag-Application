import { notFound } from 'next/navigation'
import { OrderBuilder } from '@/components/catalog/order-builder'
import { CustomerOrderReadonly } from '@/components/orders/customer-order-readonly'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import type { Brand, CatalogProduct, CustomerProduct, OrderStatus, PalletDeal, Product } from '@/lib/types'
import { getProductDisplayName, getProductPackLabel } from '@/lib/utils'

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
  const db = await getRequestDb()

  const { rows: orderRows } = await db.query<{
    id: string
    customer_id: string
    delivery_date: string
    status: string
    total: number | null
    item_count: number | null
    submitted_at: string | null
    delivered_at: string | null
  }>(
    `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text
     from orders
     where id = $1 and customer_id = $2
     limit 1`,
    [id, customerId]
  )

  const order = orderRows[0]
  if (!order) {
    notFound()
  }

  if (order.status !== 'draft') {
    const { rows: orderItems } = await db.query<{
      id: string
      product_id: string | null
      pallet_deal_id: string | null
      quantity: number
      unit_price: number | null
      line_total: number | null
    }>(
      `select id, product_id, pallet_deal_id, quantity, unit_price, line_total
       from order_items
       where order_id = $1 and quantity > 0
       order by id asc`,
      [order.id]
    )

    const productIds = orderItems
      .map((item) => item.product_id)
      .filter((value): value is string => Boolean(value))
    const palletIds = orderItems
      .map((item) => item.pallet_deal_id)
      .filter((value): value is string => Boolean(value))

    const [productsResult, palletsResult, brandsResult] = await Promise.all([
      productIds.length
        ? db.query<{
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
             where id = any($1::uuid[])`,
            [productIds]
          )
        : Promise.resolve({ rows: [] }),
      palletIds.length
        ? db.query<{ id: string; title: string; description: string | null }>(
            `select id, title, description
             from pallet_deals
             where id = any($1::uuid[])`,
            [palletIds]
          )
        : Promise.resolve({ rows: [] }),
      db.query<{ id: string; name: string }>('select id, name from brands'),
    ])

    const productById = new Map(productsResult.rows.map((product) => [product.id, product] as const))
    const palletById = new Map(palletsResult.rows.map((pallet) => [pallet.id, pallet] as const))
    const brandById = new Map(brandsResult.rows.map((brand) => [brand.id, brand.name] as const))

    const items = orderItems.map((item) => {
      const product = item.product_id ? productById.get(item.product_id) : null
      const pallet = item.pallet_deal_id ? palletById.get(item.pallet_deal_id) : null
      const brandName = product?.brand_id ? brandById.get(product.brand_id) ?? null : null

      return {
        id: item.id,
        title: product ? getProductDisplayName(product, brandName) : pallet?.title ?? 'Unknown item',
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

  const [productsResult, brandsResult, customerProductsResult, palletDealsResult, orderItemsResult] =
    await Promise.all([
      db.query<Product>(
        `select id, brand_id, customer_id, title, pack_details, pack_count, size_value, size_uom, price, image_url, is_new, is_discontinued, tags, case_length, case_width, case_height, sort_order, created_at::text, updated_at::text
         from products
         where is_discontinued = false
           and (customer_id is null or customer_id = $1)
         order by sort_order asc`,
        [customerId]
      ),
      db.query<Brand>(
        `select id, name, logo_url, sort_order, created_at::text
         from brands
         order by sort_order asc`
      ),
      db.query<CustomerProduct>(
        `select customer_id, product_id, excluded, custom_price
         from customer_products
         where customer_id = $1`,
        [customerId]
      ),
      db.query<PalletDeal>(
        `select id, title, pallet_type, image_url, price, savings_text, description, is_active, sort_order, created_at::text
         from pallet_deals
         where is_active = true
         order by sort_order asc`
      ),
      db.query<{
        product_id: string | null
        pallet_deal_id: string | null
        quantity: number
        unit_price: number
      }>(
        `select product_id, pallet_deal_id, quantity, unit_price
         from order_items
         where order_id = $1 and quantity > 0`,
        [order.id]
      ),
    ])

  const palletDealIds = palletDealsResult.rows.map((deal) => deal.id)
  const palletItemsResult = palletDealIds.length
    ? await db.query<{ pallet_deal_id: string; product_id: string }>(
        `select pallet_deal_id, product_id
         from pallet_deal_items
         where pallet_deal_id = any($1::uuid[])`,
        [palletDealIds]
      )
    : { rows: [] }

  const brandById = new Map(brandsResult.rows.map((brand) => [brand.id, brand]))
  const customerProductById = new Map(customerProductsResult.rows.map((entry) => [entry.product_id, entry]))
  const productToPalletDealIds: Record<string, string[]> = {}

  for (const row of palletItemsResult.rows) {
    const current = productToPalletDealIds[row.product_id] ?? []
    if (!current.includes(row.pallet_deal_id)) {
      current.push(row.pallet_deal_id)
      productToPalletDealIds[row.product_id] = current
    }
  }

  const catalogProducts: CatalogProduct[] = productsResult.rows
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
      palletDeals={palletDealsResult.rows}
      showPrices={profile.show_prices}
      defaultGroupBy={profile.default_group}
      initialItems={orderItemsResult.rows}
      productToPalletDealIds={productToPalletDealIds}
    />
  )
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'draft'
}
