import { redirect } from 'next/navigation'
import { CustomersTableManager, type CustomerListRow } from '@/components/admin/customers-table-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { NewCustomerDialog } from '@/components/admin/new-customer-dialog'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { provisionCustomerProfile } from '@/lib/server/customer-provisioning'
import { requirePageAuth } from '@/lib/server/page-auth'

interface CustomersPageProps {
  searchParams?: Promise<{ q?: string }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolved = searchParams ? await searchParams : undefined
  const searchQuery = (resolved?.q ?? '').trim()

  const { rows: customers } = await db.query<{
    id: string
    business_name: string | null
    contact_name: string | null
    email: string | null
    phone: string | null
    access_token: string | null
    tags: string[]
  }>(
    `select
        p.id,
        p.business_name,
        p.contact_name,
        p.email,
        p.phone,
        p.access_token,
        p.tags
      from profiles p
      where p.role = 'customer'
      order by p.business_name asc nulls last, p.contact_name asc nulls last, p.id asc`
  )

  const rows: CustomerListRow[] = customers.map((c) => ({
    id: c.id,
    businessName: c.business_name ?? c.contact_name ?? 'Unnamed customer',
    email: c.email,
    phone: c.phone,
    portalUrl: c.access_token ? `/portal/${c.access_token}` : null,
    tags: c.tags,
  }))

  async function createCustomer(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])

    const businessName = String(formData.get('businessName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()

    if (!businessName) throw new Error('Business name is required.')
    if (!email) throw new Error('Email is required to provision a customer portal access link.')

    await provisionCustomerProfile({ businessName, email })
    redirect('/admin/customers')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description={`${rows.length} customer${rows.length === 1 ? '' : 's'}`}
        actions={<NewCustomerDialog action={createCustomer} variant="header" />}
      />

      <CustomersTableManager
        rows={rows}
        searchQuery={searchQuery}
        search={
          <LiveQueryInput placeholder="Search customers..." initialValue={searchQuery} />
        }
      />

      <NewCustomerDialog action={createCustomer} variant="fab" />
    </div>
  )
}
