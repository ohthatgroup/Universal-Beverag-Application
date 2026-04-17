import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Mail, Phone, Plus } from 'lucide-react'
import { CustomerPortalLink } from '@/components/admin/customer-portal-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency, formatDeliveryDate, getStatusIcon, getStatusLabel, todayISODate } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const [{ rows: customers }, { rows: orderHistory }, { rows: excludedCountRows }] = await Promise.all([
    db.query<{
      id: string
      business_name: string | null
      contact_name: string | null
      email: string | null
      phone: string | null
      address: string | null
      city: string | null
      state: string | null
      zip: string | null
      show_prices: boolean | null
      custom_pricing: boolean | null
      default_group: 'brand' | 'size' | null
      access_token: string | null
    }>(
      `select id, business_name, contact_name, email, phone, address, city, state, zip, show_prices, custom_pricing, default_group, access_token
       from profiles
       where id = $1 and role = 'customer'
       limit 1`,
      [id]
    ),
    db.query<{
      id: string
      delivery_date: string
      status: string
      total: number | null
      item_count: number | null
      created_at: string
    }>(
      `select id, delivery_date::text, status, total, item_count, created_at::text
       from orders
       where customer_id = $1
       order by delivery_date desc
       limit 20`,
      [id]
    ),
    db.query<{ count: string }>(
      `select count(*)::text as count
       from customer_products
       where customer_id = $1 and excluded = true`,
      [id]
    ),
  ])

  const customer = customers[0] ?? null
  if (!customer) notFound()

  const customerName = customer.business_name || customer.contact_name || 'Customer'
  const orders = orderHistory ?? []

  async function updateCustomer(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()

    await actionDb.query(
      `update profiles
       set business_name = $2,
           contact_name = $3,
           email = $4,
           phone = $5,
           address = $6,
           city = $7,
           state = $8,
           zip = $9,
           show_prices = $10,
           custom_pricing = $11,
           default_group = $12,
           updated_at = now()
       where id = $1`,
      [
        id,
        String(formData.get('business_name') ?? '').trim() || null,
        String(formData.get('contact_name') ?? '').trim() || null,
        String(formData.get('email') ?? '').trim() || null,
        String(formData.get('phone') ?? '').trim() || null,
        String(formData.get('address') ?? '').trim() || null,
        String(formData.get('city') ?? '').trim() || null,
        String(formData.get('state') ?? '').trim() || null,
        String(formData.get('zip') ?? '').trim() || null,
        formData.get('show_prices') === 'on',
        formData.get('custom_pricing') === 'on',
        (formData.get('default_group') as 'brand' | 'size') || 'brand',
      ]
    )
    redirect(`/admin/customers/${id}`)
  }

  async function createOrderForCustomer(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()

    const deliveryDate = String(formData.get('delivery_date') ?? '').trim()
    if (!isoDateRegex.test(deliveryDate)) {
      throw new Error('Delivery date must use YYYY-MM-DD format')
    }

    const { rows: existingDraftRows } = await actionDb.query<{ id: string }>(
      `select id
       from orders
       where customer_id = $1 and delivery_date = $2 and status = 'draft'
       limit 1`,
      [id, deliveryDate]
    )

    if (existingDraftRows[0]?.id) {
      redirect(`/admin/orders/${existingDraftRows[0].id}?returnTo=${encodeURIComponent(`/admin/customers/${id}`)}`)
    }

    const { rows: createdOrderRows } = await actionDb.query<{ id: string }>(
      `insert into orders (customer_id, delivery_date, status)
       values ($1, $2, 'draft')
       returning id`,
      [id, deliveryDate]
    )
    const createdOrder = createdOrderRows[0]
    if (!createdOrder) throw new Error('Unable to create draft order')

    redirect(`/admin/orders/${createdOrder.id}?returnTo=${encodeURIComponent(`/admin/customers/${id}`)}`)
  }

  async function deleteCustomer() {
    'use server'

    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()
    await actionDb.query('delete from profiles where id = $1', [id])
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
        {/* Quick contact info */}
        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
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
        </div>
      </div>

      {/* Portal Link - prominent at top */}
      <CustomerPortalLink customerId={customer.id} accessToken={customer.access_token} />

      {/* Two-column layout on desktop */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column: Customer Info + Catalog Settings */}
        <div className="space-y-6">
          {/* Customer info form - always visible */}
          <form action={updateCustomer} className="space-y-4 rounded-lg border p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Customer Info</h2>

            <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="space-y-2 sm:col-span-2">
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

            <h2 className="pt-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Catalog Settings</h2>

            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
              <label className="flex min-h-[52px] flex-1 items-center justify-between rounded-lg border p-3 lg:min-w-[220px]">
                <span className="text-sm font-medium">Show prices</span>
                <span className="relative inline-flex h-5 w-9 items-center">
                  <input defaultChecked={customer.show_prices ?? true} name="show_prices" type="checkbox" className="peer sr-only" />
                  <span className="h-5 w-9 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                  <span className="absolute left-[2px] h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
                </span>
              </label>
              <label className="flex min-h-[52px] flex-1 items-center justify-between rounded-lg border p-3 lg:min-w-[220px]">
                <span className="text-sm font-medium">Custom pricing</span>
                <span className="relative inline-flex h-5 w-9 items-center">
                  <input defaultChecked={customer.custom_pricing ?? false} name="custom_pricing" type="checkbox" className="peer sr-only" />
                  <span className="h-5 w-9 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                  <span className="absolute left-[2px] h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
                </span>
              </label>

              <div className="space-y-2 lg:min-w-[220px] lg:flex-1">
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
            </div>

            <Button type="submit">Save</Button>
          </form>

          {/* Manage Products link */}
          <Link
            href={`/admin/customers/${id}/products`}
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
          >
            <div>
              <div className="text-sm font-medium">Manage Products</div>
              <div className="text-xs text-muted-foreground">{Number(excludedCountRows[0]?.count ?? 0)} excluded</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {/* Danger zone */}
          <form action={deleteCustomer}>
            <Button type="submit" variant="destructive" size="sm">
              Delete Customer
            </Button>
          </form>
        </div>

        {/* Right column: Orders */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Orders</h2>

            <form action={createOrderForCustomer} className="flex gap-2">
              <Input name="delivery_date" type="date" required defaultValue={todayISODate()} className="flex-1" />
              <Button type="submit" size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New
              </Button>
            </form>

            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No order history yet.</p>
            ) : (
              <div className="space-y-0">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}?returnTo=${encodeURIComponent(`/admin/customers/${id}`)}`}
                    className="flex items-center justify-between border-b py-3 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-sm">{formatDeliveryDate(order.delivery_date)}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.item_count ?? 0} items - {formatCurrency(order.total ?? 0)}
                      </div>
                    </div>
                    <span className="text-sm">
                      {getStatusIcon(order.status as OrderStatus)} {getStatusLabel(order.status as OrderStatus)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

