import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { CustomersTableManager, type CustomerListRow } from '@/components/admin/customers-table-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildCustomerPortalBasePath } from '@/lib/portal-links'
import { getRequestDb } from '@/lib/server/db'
import { provisionCustomerProfile } from '@/lib/server/customer-provisioning'
import { requirePageAuth } from '@/lib/server/page-auth'

interface CustomersPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const context = await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const { rows: customers } = await db.query<{
    id: string
    business_name: string | null
    contact_name: string | null
    email: string | null
    phone: string | null
    access_token: string | null
    last_order_date: string | null
  }>(
    `select
        p.id,
        p.business_name,
        p.contact_name,
        p.email,
        p.phone,
        p.access_token,
        max(o.delivery_date)::text as last_order_date
      from profiles p
      left join orders o on o.customer_id = p.id
      where p.role = 'customer'
      group by p.id, p.business_name, p.contact_name, p.email, p.phone, p.access_token
      order by p.business_name asc nulls last, p.contact_name asc nulls last, p.id asc`
  )

  const customerRows: CustomerListRow[] = customers.map((customer) => ({
    id: customer.id,
    businessName: customer.business_name ?? customer.contact_name ?? 'Unnamed customer',
    email: customer.email,
    phone: customer.phone,
    lastOrderDate: customer.last_order_date,
    portalUrl: buildCustomerPortalBasePath(customer.access_token),
  }))

  const filteredRows = searchTerm
    ? customerRows.filter((row) =>
        [row.businessName, row.email, row.phone]
          .map((value) => (value ?? '').toLowerCase())
          .some((value) => value.includes(searchTerm))
      )
    : customerRows

  async function createCustomer(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])

    const businessName = String(formData.get('businessName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()

    if (!businessName) {
      throw new Error('Business name is required.')
    }
    if (!email) {
      throw new Error('Email is required to provision a customer portal access link.')
    }

    await provisionCustomerProfile({
      businessName,
      email,
    })

    redirect('/admin/customers')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {context.profile.contact_name ?? context.profile.email ?? 'salesman'}
          </p>
        </div>

        <form action={createCustomer} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input id="business-name" name="businessName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="owner@business.com" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <LiveQueryInput
          initialValue={searchQuery}
          placeholder="Search business, contact, email, phone"
        />
        <CustomersTableManager rows={filteredRows} />
      </div>
    </div>
  )
}
