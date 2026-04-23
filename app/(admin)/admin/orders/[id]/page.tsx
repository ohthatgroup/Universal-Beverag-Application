import { notFound, redirect } from 'next/navigation'
import { Check, Trash2 } from 'lucide-react'
import { ProductPickerDialog } from '@/components/admin/product-picker-dialog'
import { AdminOrderEditor, type AdminOrderEditorItem } from '@/components/admin/admin-order-editor'
import { Button } from '@/components/ui/button'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import type { OrderStatus } from '@/lib/types'
import { getProductDisplayName, getProductPackLabel, getProductSizeLabel } from '@/lib/utils'

function resolveReturnTo(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return '/admin/dashboard'
  if (!trimmed.startsWith('/admin/')) return '/admin/dashboard'
  if (trimmed.startsWith('/admin/orders/')) return '/admin/dashboard'
  return trimmed
}

// r5: Back always reads "Back" — the editor uses router.back() for actual nav.
function getBackLabel(_pathname: string) {
  return 'Back'
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ returnTo?: string }>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const returnTo = resolveReturnTo(resolvedSearchParams?.returnTo)
  const backLabel = getBackLabel(returnTo)
  const auth = await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const { rows: orderRows } = await db.query<{
    id: string
    customer_id: string | null
    delivery_date: string
    status: string
    total: number | null
    item_count: number | null
    submitted_at: string | null
  }>(
    `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text
     from orders
     where id = $1
     limit 1`,
    [id]
  )
  const order = orderRows[0] ?? null

  if (!order) {
    notFound()
  }

  const [
    { rows: customers },
    { rows: items },
    { rows: products },
    { rows: pallets },
    { rows: brands },
    { rows: priorOrdered },
    { rows: salesmanRows },
  ] = await Promise.all([
      order.customer_id
        ? db.query<{
            id: string
            business_name: string | null
            contact_name: string | null
            email: string | null
            phone: string | null
            access_token: string | null
            default_group: string | null
          }>(
            `select id, business_name, contact_name, email, phone, access_token, default_group
             from profiles
             where id = $1
             limit 1`,
            [order.customer_id]
          )
        : Promise.resolve({ rows: [] }),
      db.query<{
        id: string
        product_id: string | null
        pallet_deal_id: string | null
        quantity: number
        unit_price: number
        line_total: number | null
      }>(
        `select id, product_id, pallet_deal_id, quantity, unit_price, line_total
         from order_items
         where order_id = $1
         order by id asc`,
        [order.id]
      ),
      db.query<{
        id: string
        title: string
        brand_id: string | null
        pack_details: string | null
        pack_count: number | null
        size_value: number | null
        size_uom: string | null
        price: number
        is_discontinued: boolean | null
      }>(
        `select id, title, brand_id, pack_details, pack_count, size_value, size_uom, price, is_discontinued
         from products
         where is_discontinued = false and (${order.customer_id ? '(customer_id is null or customer_id = $1)' : 'customer_id is null'})
         order by title asc`,
        order.customer_id ? [order.customer_id] : []
      ),
      db.query<{ id: string; title: string; description: string | null }>('select id, title, description from pallet_deals'),
      db.query<{ id: string; name: string }>('select id, name from brands'),
      order.customer_id
        ? db.query<{ product_id: string }>(
            `select distinct oi.product_id
             from order_items oi
             join orders o on o.id = oi.order_id
             where o.customer_id = $1 and oi.product_id is not null`,
            [order.customer_id]
          )
        : Promise.resolve({ rows: [] }),
      db.query<{ office_email: string | null }>(
        `select office_email from profiles where id = $1 limit 1`,
        [auth.userId]
      ),
    ])

  const salesmanOfficeEmail = salesmanRows[0]?.office_email ?? null

  const customer = customers[0] ?? null
  const productById = new Map(products.map((product) => [product.id, product] as const))
  const palletById = new Map(pallets.map((pallet) => [pallet.id, pallet] as const))
  const brandById = new Map(brands.map((brand) => [brand.id, brand.name] as const))
  const orderStatus = asOrderStatus(order.status)
  const orderId = order.id
  const submittedAt = order.submitted_at
  const orderItems = items
  const getItemHref = (item: { product_id: string | null; pallet_deal_id: string | null }) => {
    if (item.product_id) return `/admin/catalog/${item.product_id}`
    if (item.pallet_deal_id) return `/admin/catalog/pallets/${item.pallet_deal_id}`
    return null
  }
  const orderDeepLink = buildCustomerOrderDeepLink(customer?.access_token ?? null, order.id)
  const pickerProducts = products.map((product) => ({
    id: product.id,
    title: product.title,
    brandLabel: product.brand_id ? brandById.get(product.brand_id) ?? 'No brand' : 'No brand',
    packLabel: getProductPackLabel(product) ?? 'N/A',
    sizeLabel: getProductSizeLabel(product) ?? undefined,
    price: Number(product.price ?? 0),
  }))
  const previouslyOrderedIds = priorOrdered.map((row) => row.product_id)
  const currentQuantities: Record<string, number> = {}
  for (const item of orderItems) {
    if (item.product_id) currentQuantities[item.product_id] = item.quantity
  }

  const customerName = customer?.business_name || customer?.contact_name || 'Unknown customer'

  async function markDelivered() {
    'use server'

    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()
    const now = new Date().toISOString()
    await actionDb.query(
      `update orders
       set status = 'delivered',
           delivered_at = $2,
           submitted_at = coalesce(submitted_at, $3)
       where id = $1`,
      [orderId, now, submittedAt ?? now]
    )

    redirect(`/admin/orders/${orderId}`)
  }

  async function cancelOrder() {
    'use server'

    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()
    await actionDb.query(
      `update orders
       set status = 'draft',
           delivered_at = null
       where id = $1`,
      [orderId]
    )

    redirect(`/admin/orders/${orderId}`)
  }

  async function deleteOrder() {
    'use server'

    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()
    await actionDb.transaction(async (client) => {
      await client.query('delete from order_items where order_id = $1', [orderId])
      await client.query('delete from orders where id = $1', [orderId])
    })

    redirect('/admin/orders')
  }

  const editorItems: AdminOrderEditorItem[] = orderItems.map((item) => {
    const product = item.product_id ? productById.get(item.product_id) : null
    const pallet = item.pallet_deal_id ? palletById.get(item.pallet_deal_id) : null
    const brandName = product?.brand_id ? brandById.get(product.brand_id) ?? null : null
    return {
      id: item.id,
      productId: item.product_id,
      palletDealId: item.pallet_deal_id,
      label: product ? getProductDisplayName(product, brandName) : pallet?.title ?? 'Unknown item',
      pack: (product ? getProductPackLabel(product) : null) ?? pallet?.description ?? null,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price ?? 0),
      lineTotal: Number(item.line_total ?? 0),
      href: getItemHref(item),
    }
  })

  return (
    <AdminOrderEditor
      orderId={order.id}
      customerName={customerName}
      customerEmail={customer?.email ?? null}
      customerPhone={customer?.phone ?? null}
      customerHref={customer ? `/admin/customers/${customer.id}` : null}
      deliveryDate={order.delivery_date}
      status={orderStatus}
      itemCount={order.item_count ?? orderItems.length}
      total={Number(order.total ?? 0)}
      items={editorItems}
      backHref={returnTo}
      backLabel={backLabel}
      shareLink={orderDeepLink}
      csvHref={`/api/orders/${order.id}/csv`}
      salesmanOfficeEmail={salesmanOfficeEmail}
      addProductSlot={
        order.status === 'draft' ? (
          <ProductPickerDialog
            mode="order"
            endpoint={`/api/orders/${order.id}/items`}
            title="Add Product to Order"
            triggerLabel="Add"
            products={pickerProducts}
            previouslyOrderedIds={previouslyOrderedIds}
            currentQuantities={currentQuantities}
            defaultGroupBy={customer?.default_group === 'size' ? 'size' : 'brand'}
          />
        ) : null
      }
      markDeliveredSlot={
        order.status === 'submitted' ? (
          <form action={markDelivered}>
            <Button size="sm" type="submit" variant="outline">
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Mark Delivered
            </Button>
          </form>
        ) : null
      }
      onCancelAction={
        <form action={cancelOrder} className="w-full">
          <button type="submit" className="w-full text-left text-sm">
            Cancel order
          </button>
        </form>
      }
      onDeleteAction={
        <form action={deleteOrder} className="w-full">
          <button type="submit" className="inline-flex w-full items-center text-left text-sm">
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete order
          </button>
        </form>
      }
    />
  )
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'draft'
}
