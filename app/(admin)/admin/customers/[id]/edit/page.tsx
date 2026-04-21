import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DangerZoneDeleteCustomer } from '@/components/admin/danger-zone-delete-customer'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function CustomerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const { rows: customers } = await db.query<{
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
  }>(
    `select id, business_name, contact_name, email, phone, address, city, state, zip,
            show_prices, custom_pricing, default_group
     from profiles
     where id = $1 and role = 'customer'
     limit 1`,
    [id]
  )

  const customer = customers[0] ?? null
  if (!customer) notFound()

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

  async function deleteCustomer() {
    'use server'
    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()
    await actionDb.query('delete from profiles where id = $1', [id])
    redirect('/admin/customers')
  }

  const businessName = customer.business_name ?? customer.contact_name ?? 'this customer'

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-28 pt-2 md:pb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Edit details</h1>
        <Link
          href={`/admin/customers/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>

      <form action={updateCustomer} className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contact
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business name</Label>
              <Input id="business_name" name="business_name" defaultValue={customer.business_name ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact name</Label>
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
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Catalog
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Show prices</span>
              <input defaultChecked={customer.show_prices ?? true} name="show_prices" type="checkbox" />
            </label>
            <label className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Custom pricing</span>
              <input defaultChecked={customer.custom_pricing ?? false} name="custom_pricing" type="checkbox" />
            </label>
            <div className="space-y-2">
              <Label>Default grouping</Label>
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
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-2 md:backdrop-blur-none">
          <div className="mx-auto flex max-w-lg items-center">
            <Button type="submit">Save changes</Button>
          </div>
        </div>
      </form>

      <DangerZoneDeleteCustomer businessName={businessName} action={deleteCustomer} />
    </div>
  )
}
