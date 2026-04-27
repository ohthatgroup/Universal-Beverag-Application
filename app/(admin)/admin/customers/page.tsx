import { redirect } from 'next/navigation'
import { CustomerListRow, type CustomerListItem } from '@/components/admin/customer-list-row'
import { CustomerWorkbench } from '@/components/admin/customer-workbench'
import { DirectoryWorkbench } from '@/components/admin/directory-workbench'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { MomentStream } from '@/components/admin/moment-stream'
import { NewCustomerDialog } from '@/components/admin/new-customer-dialog'
import { PageHeader } from '@/components/ui/page-header'
import type { GroupOption } from '@/components/admin/customer-type-picker'
import { getCustomersPageMoments } from '@/lib/server/admin-prompts'
import { getRequestDb } from '@/lib/server/db'
import { provisionCustomerProfile } from '@/lib/server/customer-provisioning'
import { resolveDefaultGroupId } from '@/lib/server/default-group'
import { requirePageAuth } from '@/lib/server/page-auth'

interface CustomersPageProps {
  searchParams?: Promise<{ q?: string; id?: string }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolved = searchParams ? await searchParams : undefined
  const searchQuery = (resolved?.q ?? '').trim()
  const selectedId = resolved?.id ?? null

  const [{ rows: customers }, moments, groupsResult, defaultGroupId] =
    await Promise.all([
      db.query<{
        id: string
        business_name: string | null
        contact_name: string | null
        group_name: string | null
        last_order_at: string | null
      }>(
        `select
           p.id,
           p.business_name,
           p.contact_name,
           g.name as group_name,
           (
             select max(o.delivery_date)::text
               from orders o
              where o.customer_id = p.id and o.status in ('submitted','delivered')
           ) as last_order_at
         from profiles p
         left join customer_groups g on g.id = p.customer_group_id
         where p.role = 'customer'
         order by p.business_name asc nulls last, p.contact_name asc nulls last, p.id asc`,
      ),
      getCustomersPageMoments(db),
      db.query<{ id: string; name: string }>(
        `select id, name from customer_groups order by sort_order asc, lower(name) asc`,
      ),
      resolveDefaultGroupId(),
    ])

  const groups: GroupOption[] = groupsResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    isDefault: row.id === defaultGroupId,
  }))

  const term = searchQuery.toLowerCase()
  const items: CustomerListItem[] = customers
    .filter((c) => {
      if (!term) return true
      return [c.business_name ?? '', c.contact_name ?? '']
        .map((v) => v.toLowerCase())
        .some((v) => v.includes(term))
    })
    .map((c) => ({
      id: c.id,
      businessName: c.business_name ?? c.contact_name ?? 'Unnamed customer',
      contextLine: buildContextLine(c.group_name, c.last_order_at),
      activityHint: buildActivityHint(c.last_order_at),
    }))

  async function createCustomer(formData: FormData) {
    'use server'
    await requirePageAuth(['salesman'])
    const businessName = String(formData.get('businessName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const customerGroupId = String(formData.get('customerGroupId') ?? '').trim()
    if (!businessName) throw new Error('Business name is required.')
    if (!email) throw new Error('Email is required to provision a customer portal access link.')
    if (!customerGroupId) throw new Error('Type is required.')
    await provisionCustomerProfile({ businessName, email, customerGroupId })
    redirect('/admin/customers')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${items.length} customer${items.length === 1 ? '' : 's'}`}
      />
      <MomentStream moments={moments} />
      <DirectoryWorkbench
        list={
          <div className="space-y-3">
            <LiveQueryInput
              placeholder="Search customers…"
              initialValue={searchQuery}
              className="w-full"
            />
            <ul className="rounded-lg border border-foreground/10">
              {items.map((item) => (
                <li key={item.id}>
                  <CustomerListRow customer={item} selectedId={selectedId} />
                </li>
              ))}
            </ul>
          </div>
        }
        detail={
          selectedId ? (
            <CustomerWorkbench customerId={selectedId} showBreadcrumb={false} />
          ) : null
        }
        emptyDetail={
          <p className="px-2 py-12 text-center text-[14px] text-muted-foreground/70">
            Pick a customer to see their full picture.
          </p>
        }
      />
      <NewCustomerDialog
        action={createCustomer}
        variant="fab"
        groups={groups}
        defaultGroupId={defaultGroupId}
      />
    </div>
  )
}

function buildContextLine(
  groupName: string | null,
  lastOrderAt: string | null,
): string | null {
  const parts: string[] = []
  if (groupName) parts.push(groupName)
  if (lastOrderAt) {
    const days = daysBetween(lastOrderAt, new Date())
    parts.push(days === 0 ? 'ordered today' : `${days}d since last order`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

function buildActivityHint(lastOrderAt: string | null): string | null {
  if (!lastOrderAt) return null
  const days = daysBetween(lastOrderAt, new Date())
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}

function daysBetween(iso: string, now: Date): number {
  const past = new Date(iso)
  const ms = now.getTime() - past.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}
