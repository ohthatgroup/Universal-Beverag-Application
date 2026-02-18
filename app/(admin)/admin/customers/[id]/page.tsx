import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CustomerMagicLinkGenerator } from '@/components/admin/customer-magic-link-generator'
import { OrderLinkActions } from '@/components/admin/order-link-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency, formatDeliveryDate, todayISODate } from '@/lib/utils'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const supabase = await createClient()

  const [{ data: customer, error: customerError }, { data: orderHistory }, { count: excludedCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'customer')
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id,delivery_date,status,total,item_count,created_at')
      .eq('customer_id', id)
      .order('delivery_date', { ascending: false })
      .limit(20),
    supabase
      .from('customer_products')
      .select('*', { head: true, count: 'exact' })
      .eq('customer_id', id)
      .eq('excluded', true),
  ])

  if (customerError) {
    throw customerError
  }

  if (!customer) {
    notFound()
  }

  async function updateCustomer(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])
    const supabaseClient = await createClient()
    const showPrices = formData.get('show_prices') === 'on'
    const customPricing = formData.get('custom_pricing') === 'on'

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        business_name: String(formData.get('business_name') ?? '').trim() || null,
        contact_name: String(formData.get('contact_name') ?? '').trim() || null,
        email: String(formData.get('email') ?? '').trim() || null,
        phone: String(formData.get('phone') ?? '').trim() || null,
        address: String(formData.get('address') ?? '').trim() || null,
        city: String(formData.get('city') ?? '').trim() || null,
        state: String(formData.get('state') ?? '').trim() || null,
        zip: String(formData.get('zip') ?? '').trim() || null,
        show_prices: showPrices,
        custom_pricing: customPricing,
        default_group: (formData.get('default_group') as 'brand' | 'size') || 'brand',
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    redirect(`/admin/customers/${id}`)
  }

  async function createOrderForCustomer(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])
    const supabaseClient = await createClient()

    const deliveryDate = String(formData.get('delivery_date') ?? '').trim()
    if (!isoDateRegex.test(deliveryDate)) {
      throw new Error('Delivery date must use YYYY-MM-DD format')
    }

    const { data: existingDraft, error: existingDraftError } = await supabaseClient
      .from('orders')
      .select('id')
      .eq('customer_id', id)
      .eq('delivery_date', deliveryDate)
      .eq('status', 'draft')
      .maybeSingle()

    if (existingDraftError) {
      throw existingDraftError
    }

    if (existingDraft?.id) {
      redirect(`/admin/orders/${existingDraft.id}`)
    }

    const { data: createdOrder, error: createOrderError } = await supabaseClient
      .from('orders')
      .insert({
        customer_id: id,
        delivery_date: deliveryDate,
        status: 'draft',
      })
      .select('id')
      .single()

    if (createOrderError || !createdOrder) {
      throw createOrderError ?? new Error('Unable to create draft order')
    }

    redirect(`/admin/orders/${createdOrder.id}`)
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{customer.business_name || customer.contact_name || 'Customer Detail'}</h1>
        <Link className="text-sm underline" href={`/admin/customers/${id}/products`}>
          Manage Products
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Phone: {customer.phone ?? 'No phone'}</div>
          <div>Email: {customer.email ?? 'No email'}</div>
          <div>Address: {[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ') || 'No address'}</div>
          <div className="flex flex-wrap gap-2">
            {customer.phone && (
              <Button asChild size="sm" variant="outline">
                <a href={`tel:${customer.phone}`}>Call</a>
              </Button>
            )}
            {customer.email && (
              <Button asChild size="sm" variant="outline">
                <a href={`mailto:${customer.email}`}>Email</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCustomer} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input id="business_name" name="business_name" defaultValue={customer.business_name ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input id="contact_name" name="contact_name" defaultValue={customer.contact_name ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={customer.email ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={customer.phone ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={customer.address ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={customer.city ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue={customer.state ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Zip</Label>
                <Input id="zip" name="zip" defaultValue={customer.zip ?? ''} />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked={customer.show_prices ?? true} name="show_prices" type="checkbox" />
                Show prices to customer
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked={customer.custom_pricing ?? false} name="custom_pricing" type="checkbox" />
                Enable custom pricing
              </label>
            </div>

            <div className="space-y-2">
              <Label>Default Grouping</Label>
              <select
                name="default_group"
                defaultValue={customer.default_group ?? 'brand'}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="brand">Brand</option>
                <option value="size">Size</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground">{excludedCount ?? 0} excluded products</p>
            <Button type="submit">Save customer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={createOrderForCustomer} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input name="delivery_date" type="date" required defaultValue={todayISODate()} />
            <Button type="submit">+ New Order for Customer</Button>
          </form>

          {(orderHistory ?? []).map((order) => (
            <div key={order.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">{formatDeliveryDate(order.delivery_date)}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.item_count ?? 0} items • {formatCurrency(order.total ?? 0)} • {order.status}
                  </div>
                </div>
                <Link className="text-xs underline" href={`/admin/orders/${order.id}`}>
                  Open
                </Link>
              </div>
              <OrderLinkActions orderId={order.id} className="mt-2" />
            </div>
          ))}
          {(orderHistory ?? []).length === 0 && <p className="text-muted-foreground">No order history yet.</p>}
        </CardContent>
      </Card>

      <CustomerMagicLinkGenerator customerId={customer.id} customerEmail={customer.email} />
    </div>
  )
}
