import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Mail, Phone, Plus } from 'lucide-react'
import { CustomerPortalLink } from '@/components/admin/customer-portal-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency, formatDeliveryDate, getStatusIcon, getStatusLabel, todayISODate } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

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

  const customerName = customer.business_name || customer.contact_name || 'Customer'
  const orders = orderHistory ?? []

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

  async function deleteCustomer() {
    'use server'

    await requirePageAuth(['salesman'])
    const supabaseClient = await createClient()

    const { error: deleteError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    redirect('/admin/customers')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>
        <h1 className="text-2xl font-semibold">{customerName}</h1>
      </div>

      {/* Contact info */}
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
        {(customer.address || customer.city || customer.state) && (
          <span className="text-muted-foreground">
            {[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
          </span>
        )}
      </div>

      {/* Edit info — collapsible */}
      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-medium text-sm">
          Edit Info
        </summary>
        <div className="border-t p-4">
          <form action={updateCustomer} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
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
            <Button type="submit">Save</Button>
          </form>
        </div>
      </details>

      <Separator />

      {/* Catalog Settings */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Catalog Settings</h2>

        <form action={updateCustomer} className="space-y-4">
          {/* Hidden fields to preserve existing values */}
          <input type="hidden" name="business_name" value={customer.business_name ?? ''} />
          <input type="hidden" name="contact_name" value={customer.contact_name ?? ''} />
          <input type="hidden" name="email" value={customer.email ?? ''} />
          <input type="hidden" name="phone" value={customer.phone ?? ''} />
          <input type="hidden" name="address" value={customer.address ?? ''} />
          <input type="hidden" name="city" value={customer.city ?? ''} />
          <input type="hidden" name="state" value={customer.state ?? ''} />
          <input type="hidden" name="zip" value={customer.zip ?? ''} />

          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Show prices</span>
              <input defaultChecked={customer.show_prices ?? true} name="show_prices" type="checkbox" className="h-4 w-4" />
            </label>
            <label className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Custom pricing</span>
              <input defaultChecked={customer.custom_pricing ?? false} name="custom_pricing" type="checkbox" className="h-4 w-4" />
            </label>
          </div>

          <div className="space-y-2">
            <Label>Default Grouping</Label>
            <select
              name="default_group"
              defaultValue={customer.default_group ?? 'brand'}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="brand">Brand</option>
              <option value="size">Size</option>
            </select>
          </div>

          <Button type="submit" size="sm">Save Settings</Button>
        </form>

        <Link
          href={`/admin/customers/${id}/products`}
          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
        >
          <div>
            <div className="text-sm font-medium">Manage Products</div>
            <div className="text-xs text-muted-foreground">{excludedCount ?? 0} excluded</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>

      <Separator />

      {/* Orders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Orders</h2>
        </div>

        <form action={createOrderForCustomer} className="flex gap-2">
          <Input name="delivery_date" type="date" required defaultValue={todayISODate()} className="flex-1 md:w-44 md:flex-none" />
          <Button type="submit" size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Order
          </Button>
        </form>

        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No order history yet.</p>
        ) : (
          <>
            {/* Mobile */}
            <div className="space-y-0 md:hidden">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between border-b py-3 last:border-0"
                >
                  <div>
                    <div className="font-medium text-sm">{formatDeliveryDate(order.delivery_date)}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.item_count ?? 0} items · {formatCurrency(order.total ?? 0)}
                    </div>
                  </div>
                  <span className="text-sm">
                    {getStatusIcon(order.status as OrderStatus)} {getStatusLabel(order.status as OrderStatus)}
                  </span>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Items</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                          {formatDeliveryDate(order.delivery_date)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{order.item_count ?? 0}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(order.total ?? 0)}</td>
                      <td className="px-4 py-3">
                        {getStatusIcon(order.status as OrderStatus)} {getStatusLabel(order.status as OrderStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <Separator />

      {/* Portal Link */}
      <CustomerPortalLink customerId={customer.id} accessToken={customer.access_token} />

      <Separator />

      {/* Danger zone */}
      <form action={deleteCustomer}>
        <Button type="submit" variant="destructive" size="sm">
          Delete Customer
        </Button>
      </form>
    </div>
  )
}
