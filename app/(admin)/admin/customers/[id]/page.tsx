import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'customer')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!customer) {
    notFound()
  }

  async function updateCustomer(formData: FormData) {
    'use server'

    const supabaseClient = await createClient()
    const showPrices = formData.get('show_prices') === 'on'
    const customPricing = formData.get('custom_pricing') === 'on'

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        business_name: (formData.get('business_name') as string) || null,
        contact_name: (formData.get('contact_name') as string) || null,
        email: (formData.get('email') as string) || null,
        phone: (formData.get('phone') as string) || null,
        address: (formData.get('address') as string) || null,
        city: (formData.get('city') as string) || null,
        state: (formData.get('state') as string) || null,
        zip: (formData.get('zip') as string) || null,
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

  const { data: orderHistory } = await supabase
    .from('orders')
    .select('id,delivery_date,status,total,item_count,created_at')
    .eq('customer_id', id)
    .order('delivery_date', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customer Detail</h1>
        <Link className="text-sm underline" href={`/admin/customers/${id}/products`}>
          Manage Products
        </Link>
      </div>

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

            <Button type="submit">Save customer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(orderHistory ?? []).map((order) => (
            <div key={order.id} className="rounded-md border p-3">
              <div className="font-medium">{order.delivery_date}</div>
              <div className="text-xs text-muted-foreground">
                {order.status} • {order.item_count ?? 0} items • ${Number(order.total ?? 0).toFixed(2)}
              </div>
              <Link className="text-xs underline" href={`/admin/orders/${order.id}`}>
                Open order
              </Link>
            </div>
          ))}
          {(orderHistory ?? []).length === 0 && (
            <p className="text-muted-foreground">No order history yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
