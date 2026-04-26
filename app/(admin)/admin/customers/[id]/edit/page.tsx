import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { CustomerEditForm } from './customer-edit-form'
import {
  CustomerOverridesPanel,
  type CustomerOverrideRow,
  type GroupOption,
} from '@/components/admin/customer-overrides-panel'

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
  tags: string[]
  location: string | null
  show_prices: boolean | null
  custom_pricing: boolean | null
  default_group: 'brand' | 'size' | null
  customer_group_id: string | null
}

export default async function CustomerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const [customersResult, groupsResult, overrideRowsResult] = await Promise.all([
    db.query<CustomerRecord>(
      `select id, business_name, contact_name, email, phone, address, city, state, zip,
              tags, location, show_prices, custom_pricing, default_group,
              customer_group_id
         from profiles
        where id = $1 and role = 'customer'
        limit 1`,
      [id],
    ),
    db.query<{ id: string; name: string }>(
      `select id, name from customer_groups order by sort_order asc, lower(name) asc`,
    ),
    db.query<{
      announcement_id: string
      title: string | null
      kind: 'announcement' | 'deal'
      content_type: string
      global_sort_order: number
      global_is_active: boolean
      group_sort_order: number | null
      group_is_hidden: boolean | null
      customer_sort_order: number | null
      customer_is_hidden: boolean | null
    }>(
      // Resolve every announcement's default + group + customer override
      // in one shot for the override panel. Group join keys off the
      // customer's profiles.customer_group_id (resolved inline).
      `select a.id as announcement_id,
              a.title,
              a.kind,
              a.content_type,
              a.sort_order as global_sort_order,
              a.is_active  as global_is_active,
              go.sort_order as group_sort_order,
              go.is_hidden  as group_is_hidden,
              co.sort_order as customer_sort_order,
              co.is_hidden  as customer_is_hidden
         from announcements a
         left join profiles p on p.id = $1
         left join announcement_overrides go
           on go.announcement_id = a.id
          and go.scope = 'group'
          and go.scope_id = p.customer_group_id
         left join announcement_overrides co
           on co.announcement_id = a.id
          and co.scope = 'customer'
          and co.scope_id = $1
        order by coalesce(co.sort_order, go.sort_order, a.sort_order) asc,
                 a.created_at asc`,
      [id],
    ),
  ])

  const customer = customersResult.rows[0] ?? null
  if (!customer) notFound()

  const businessName = customer.business_name ?? customer.contact_name ?? 'this customer'

  const groups: GroupOption[] = groupsResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
  }))

  const overrideRows: CustomerOverrideRow[] = overrideRowsResult.rows.map(
    (row) => ({
      announcementId: row.announcement_id,
      title: row.title ?? '(Untitled)',
      kind: row.kind,
      contentType: row.content_type,
      globalSortOrder: row.global_sort_order,
      globalIsActive: row.global_is_active,
      groupSortOrder: row.group_sort_order,
      groupIsHidden: row.group_is_hidden,
      customerSortOrder: row.customer_sort_order,
      customerIsHidden: row.customer_is_hidden,
    }),
  )

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
        groups={groups}
        initialValues={{
          business_name: customer.business_name ?? '',
          contact_name: customer.contact_name ?? '',
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          address: customer.address ?? '',
          city: customer.city ?? '',
          state: customer.state ?? '',
          zip: customer.zip ?? '',
          tags: customer.tags,
          location: customer.location ?? '',
          show_prices: customer.show_prices ?? true,
          custom_pricing: customer.custom_pricing ?? false,
          default_group: customer.default_group ?? 'brand',
          customer_group_id: customer.customer_group_id ?? null,
        }}
      />

      <CustomerOverridesPanel
        customerId={customer.id}
        customerGroupId={customer.customer_group_id ?? null}
        rows={overrideRows}
      />
    </div>
  )
}
