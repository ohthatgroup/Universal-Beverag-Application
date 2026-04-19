import { redirect } from 'next/navigation'
import { CustomersSearchIndex, type CustomerIndexRow } from '@/components/admin/customers-search-index'
import { NewCustomerDialog } from '@/components/admin/new-customer-dialog'
import { getRequestDb } from '@/lib/server/db'
import { provisionCustomerProfile } from '@/lib/server/customer-provisioning'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function CustomersPage() {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const { rows: customers } = await db.query<{
    id: string
    business_name: string | null
    contact_name: string | null
    email: string | null
    phone: string | null
    last_order_date: string | null
    last_order_status: string | null
  }>(
    `select
        p.id,
        p.business_name,
        p.contact_name,
        p.email,
        p.phone,
        max(o.delivery_date)::text as last_order_date,
        (select status from orders
           where customer_id = p.id
           order by delivery_date desc, created_at desc
           limit 1) as last_order_status
      from profiles p
      left join orders o on o.customer_id = p.id
      where p.role = 'customer'
      group by p.id, p.business_name, p.contact_name, p.email, p.phone
      order by p.business_name asc nulls last, p.contact_name asc nulls last, p.id asc`
  )

  const rows: CustomerIndexRow[] = customers.map((c) => ({
    id: c.id,
    businessName: c.business_name ?? c.contact_name ?? 'Unnamed customer',
    email: c.email,
    phone: c.phone,
    lastOrderDate: c.last_order_date,
    lastOrderStatus: c.last_order_status,
  }))

  // Recently opened: derive from most-recent order activity (proxy until a real recents table)
  const recentIds = [...rows]
    .filter((r) => r.lastOrderDate)
    .sort((a, b) => (a.lastOrderDate! < b.lastOrderDate! ? 1 : -1))
    .slice(0, 5)
    .map((r) => r.id)

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
    <>
      <CustomersSearchIndex rows={rows} recentIds={recentIds} />
      <NewCustomerDialog action={createCustomer} variant="fab" />
    </>
  )
}
