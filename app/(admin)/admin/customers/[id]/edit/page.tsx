import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { CustomerEditForm } from './customer-edit-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type CustomerRecord = {
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
}

export default async function CustomerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const { rows: customers } = await db.query<CustomerRecord>(
    `select id, business_name, contact_name, email, phone, address, city, state, zip,
            show_prices, custom_pricing, default_group
     from profiles
     where id = $1 and role = 'customer'
     limit 1`,
    [id]
  )

  const customer = customers[0] ?? null
  if (!customer) notFound()

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

      <CustomerEditForm
        customerId={customer.id}
        businessName={businessName}
        initialValues={{
          business_name: customer.business_name ?? '',
          contact_name: customer.contact_name ?? '',
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          address: customer.address ?? '',
          city: customer.city ?? '',
          state: customer.state ?? '',
          zip: customer.zip ?? '',
          show_prices: customer.show_prices ?? true,
          custom_pricing: customer.custom_pricing ?? false,
          default_group: customer.default_group ?? 'brand',
        }}
      />
    </div>
  )
}
