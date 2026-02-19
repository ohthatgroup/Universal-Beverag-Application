import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Check, Download, Mail, Phone, Trash2 } from 'lucide-react'
import { CopyUrlButton } from '@/components/admin/copy-url-button'
import { OrderStatusForm } from '@/components/admin/order-status-form'
import { ProductPickerDialog } from '@/components/admin/product-picker-dialog'
import { Button } from '@/components/ui/button'
import { requirePageAuth } from '@/lib/server/page-auth'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/types'
import { formatCurrency, formatDeliveryDate, getProductDisplayName, getProductPackLabel, getStatusIcon, getStatusLabel } from '@/lib/utils'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await requirePageAuth(['salesman'])

  const { data: order, error: orderError } = await context.supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (orderError) {
    throw orderError
  }

  if (!order) {
    notFound()
  }

  const customerPromise = order.customer_id
    ? context.supabase
        .from('profiles')
        .select('id,business_name,contact_name,email,phone,access_token')
        .eq('id', order.customer_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [{ data: customer }, { data: items }, { data: products }, { data: pallets }, { data: brands }] =
    await Promise.all([
      customerPromise,
      context.supabase
        .from('order_items')
        .select('id,product_id,pallet_deal_id,quantity,unit_price,line_total')
        .eq('order_id', order.id)
        .order('id', { ascending: true }),
      context.supabase
        .from('products')
        .select('id,title,brand_id,pack_details,pack_count,size_value,size_uom,price,is_discontinued')
        .eq('is_discontinued', false),
      context.supabase.from('pallet_deals').select('id,title,description'),
      context.supabase.from('brands').select('id,name'),
    ])

  const productById = new Map((products ?? []).map((product) => [product.id, product] as const))
  const palletById = new Map((pallets ?? []).map((pallet) => [pallet.id, pallet] as const))
  const brandById = new Map((brands ?? []).map((brand) => [brand.id, brand.name] as const))
  const orderStatus = asOrderStatus(order.status)
  const orderId = order.id
  const submittedAt = order.submitted_at
  const orderItems = items ?? []
  const getItemHref = (item: { product_id: string | null; pallet_deal_id: string | null }) => {
    if (item.product_id) return `/admin/catalog/${item.product_id}`
    if (item.pallet_deal_id) return `/admin/catalog/pallets/${item.pallet_deal_id}`
    return null
  }
  const orderDeepLink = customer?.access_token
    ? `/c/${customer.access_token}/order/link/${order.id}`
    : `/admin/orders/${order.id}`
  const pickerProducts = (products ?? []).map((product) => ({
    id: product.id,
    title: product.title,
    brandLabel: product.brand_id ? brandById.get(product.brand_id) ?? 'No brand' : 'No brand',
    packLabel: getProductPackLabel(product) ?? 'N/A',
    price: Number(product.price ?? 0),
  }))

  const customerName = customer?.business_name || customer?.contact_name || 'Unknown customer'

  async function markDelivered() {
    'use server'

    await requirePageAuth(['salesman'])
    const supabase = await createClient()
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        submitted_at: submittedAt ?? new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      throw updateError
    }

    redirect(`/admin/orders/${orderId}`)
  }

  async function cancelOrder() {
    'use server'

    await requirePageAuth(['salesman'])
    const supabase = await createClient()
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'draft',
        delivered_at: null,
      })
      .eq('id', orderId)

    if (updateError) {
      throw updateError
    }

    redirect(`/admin/orders/${orderId}`)
  }

  async function deleteOrder() {
    'use server'

    await requirePageAuth(['salesman'])
    const supabase = await createClient()
    const { error: deleteError } = await supabase.from('orders').delete().eq('id', orderId)

    if (deleteError) {
      throw deleteError
    }

    redirect('/admin/orders')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">{customerName}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span>{formatDeliveryDate(order.delivery_date)}</span>
          <span>{getStatusIcon(orderStatus)} {getStatusLabel(orderStatus)}</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <OrderStatusForm orderId={order.id} initialStatus={orderStatus} />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {order.status === 'draft' && (
            <ProductPickerDialog
              mode="order"
              endpoint={`/api/orders/${order.id}/items`}
              title="Add Product to Order"
              triggerLabel="Add Product"
              products={pickerProducts}
            />
          )}
          {order.status === 'submitted' && (
            <form action={markDelivered}>
              <Button size="sm" type="submit">
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Mark Delivered
              </Button>
            </form>
          )}
          <Button asChild size="sm" variant="outline">
            <a href={`/api/orders/${order.id}/csv`}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </a>
          </Button>
          <CopyUrlButton
            iconOnly
            url={orderDeepLink}
            title="Copy order deep link"
          />
        </div>
      </div>

      {/* Customer info */}
      {customer && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <Mail className="h-3.5 w-3.5" />
              {customer.email}
            </a>
          )}
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </a>
          )}
          <Link
            href={`/admin/customers/${customer.id}`}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            View customer
          </Link>
        </div>
      )}

      {/* Order items */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Items ({order.item_count ?? orderItems.length})
        </h2>

        {orderItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items.</p>
        ) : (
          <>
            {/* Mobile list */}
            <div className="space-y-0 md:hidden">
              {orderItems.map((item) => {
                const product = item.product_id ? productById.get(item.product_id) : null
                const pallet = item.pallet_deal_id ? palletById.get(item.pallet_deal_id) : null
                const brandName = product?.brand_id ? brandById.get(product.brand_id) ?? null : null
                const itemHref = getItemHref(item)
                const content = (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {product ? getProductDisplayName(product, brandName) : pallet?.title ?? 'Unknown item'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(product ? getProductPackLabel(product) : null) ?? pallet?.description ?? ''}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatCurrency(item.unit_price)} x {item.quantity}
                      </div>
                    </div>
                    <div className="ml-4 text-sm font-medium">{formatCurrency(item.line_total ?? 0)}</div>
                  </>
                )
                return itemHref ? (
                  <Link key={item.id} href={itemHref} className="flex items-center justify-between border-b py-3 last:border-0 hover:bg-muted/30">
                    {content}
                  </Link>
                ) : (
                  <div key={item.id} className="flex items-center justify-between border-b py-3 last:border-0">
                    {content}
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Pack</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-3 text-right font-medium">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => {
                    const product = item.product_id ? productById.get(item.product_id) : null
                    const pallet = item.pallet_deal_id ? palletById.get(item.pallet_deal_id) : null
                    const brandName = product?.brand_id ? brandById.get(product.brand_id) ?? null : null
                    const itemHref = getItemHref(item)
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          {itemHref ? (
                            <Link href={itemHref} className="block">
                              {product ? getProductDisplayName(product, brandName) : pallet?.title ?? 'Unknown item'}
                            </Link>
                          ) : (
                            product ? getProductDisplayName(product, brandName) : pallet?.title ?? 'Unknown item'
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {itemHref ? (
                            <Link href={itemHref} className="block">
                              {(product ? getProductPackLabel(product) : null) ?? pallet?.description ?? ''}
                            </Link>
                          ) : (
                            (product ? getProductPackLabel(product) : null) ?? pallet?.description ?? ''
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {itemHref ? <Link href={itemHref} className="block">{item.quantity}</Link> : item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {itemHref ? <Link href={itemHref} className="block">{formatCurrency(item.unit_price)}</Link> : formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {itemHref ? <Link href={itemHref} className="block">{formatCurrency(item.line_total ?? 0)}</Link> : formatCurrency(item.line_total ?? 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between font-semibold">
              <span>{order.item_count ?? orderItems.length} items</span>
              <span>{formatCurrency(order.total ?? 0)}</span>
            </div>
          </>
        )}
      </section>

      {/* Danger zone */}
      <div className="flex flex-wrap gap-2">
        <form action={cancelOrder}>
          <Button size="sm" type="submit" variant="outline">
            Cancel Order
          </Button>
        </form>
        <form action={deleteOrder}>
          <Button size="sm" type="submit" variant="destructive">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </form>
      </div>
    </div>
  )
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'draft'
}

