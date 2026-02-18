import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderLinkActions } from '@/components/admin/order-link-actions'
import { OrderStatusForm } from '@/components/admin/order-status-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requirePageAuth } from '@/lib/server/page-auth'
import type { OrderStatus } from '@/lib/types'
import { formatCurrency, formatDeliveryDate } from '@/lib/utils'

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
      context.supabase.from('products').select('id,title,pack_details'),
      context.supabase.from('pallet_deals').select('id,title,description'),
    ])

  const productById = new Map((products ?? []).map((product) => [product.id, product] as const))
  const palletById = new Map((pallets ?? []).map((pallet) => [pallet.id, pallet] as const))
  const orderStatus = asOrderStatus(order.status)

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order Detail</h1>
        <a className="text-sm underline" href={`/api/orders/${order.id}/csv`}>
          Download CSV
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Delivery: {formatDeliveryDate(order.delivery_date)}</div>
          <div>Status: {order.status}</div>
          <div>Items: {order.item_count ?? 0}</div>
          <div>Total: {formatCurrency(order.total ?? 0)}</div>
          <div>Submitted: {order.submitted_at ? new Date(order.submitted_at).toLocaleString() : '—'}</div>
          <div>Delivered: {order.delivered_at ? new Date(order.delivered_at).toLocaleString() : '—'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>{customer?.business_name || customer?.contact_name || order.customer_id || 'Unknown customer'}</div>
          <div className="text-muted-foreground">{customer?.email ?? 'No email'}</div>
          <div className="text-muted-foreground">{customer?.phone ?? 'No phone'}</div>
          <Link className="underline" href={order.customer_id ? `/admin/customers/${order.customer_id}` : '/admin/customers'}>
            Open customer
          </Link>
        </CardContent>
      </Card>

      <OrderStatusForm orderId={order.id} initialStatus={orderStatus} />
      <OrderLinkActions orderId={order.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(items ?? []).map((item) => {
            const product = item.product_id ? productById.get(item.product_id) : null
            const pallet = item.pallet_deal_id ? palletById.get(item.pallet_deal_id) : null

            return (
              <div key={item.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{product?.title ?? pallet?.title ?? 'Unknown item'}</div>
                <div className="text-xs text-muted-foreground">
                  {product?.pack_details ?? pallet?.description ?? ''}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Qty {item.quantity} • {formatCurrency(item.unit_price)} each • {formatCurrency(item.line_total ?? 0)}
                </div>
              </div>
            )
          })}

          {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">No line items.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'draft'
}
