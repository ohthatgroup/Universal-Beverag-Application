import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Check, Download, Mail, Phone, Trash2 } from 'lucide-react'
import { OrderStatusForm } from '@/components/admin/order-status-form'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { requirePageAuth } from '@/lib/server/page-auth'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/types'
import { formatCurrency, formatDeliveryDate, getProductPackLabel, getStatusIcon, getStatusLabel } from '@/lib/utils'

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
        .select('id,business_name,contact_name,email,phone')
        .eq('id', order.customer_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [{ data: customer }, { data: items }, { data: products }, { data: pallets }] =
    await Promise.all([
      customerPromise,
      context.supabase
        .from('order_items')
        .select('id,product_id,pallet_deal_id,quantity,unit_price,line_total')
        .eq('order_id', order.id)
        .order('id', { ascending: true }),
      context.supabase.from('products').select('id,title,pack_details,pack_count,size_value,size_uom'),
      context.supabase.from('pallet_deals').select('id,title,description'),
    ])

  const productById = new Map((products ?? []).map((product) => [product.id, product] as const))
  const palletById = new Map((pallets ?? []).map((pallet) => [pallet.id, pallet] as const))
  const orderStatus = asOrderStatus(order.status)
  const orderId = order.id
  const submittedAt = order.submitted_at
  const orderItems = items ?? []

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
      <div className="flex flex-wrap gap-2">
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

      <Separator />

      {/* Status form */}
      <OrderStatusForm orderId={order.id} initialStatus={orderStatus} />

      <Separator />

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
                return (
                  <div key={item.id} className="flex items-center justify-between border-b py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{product?.title ?? pallet?.title ?? 'Unknown item'}</div>
                      <div className="text-xs text-muted-foreground">
                        {(product ? getProductPackLabel(product) : null) ?? pallet?.description ?? ''}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(item.unit_price)} × {item.quantity}
                      </div>
                    </div>
                    <div className="ml-4 text-sm font-medium">{formatCurrency(item.line_total ?? 0)}</div>
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
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">
                          {product?.title ?? pallet?.title ?? 'Unknown item'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {(product ? getProductPackLabel(product) : null) ?? pallet?.description ?? ''}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.line_total ?? 0)}</td>
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

      <Separator />

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
