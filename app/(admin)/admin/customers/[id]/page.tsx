import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronRight, Mail, MapPin, Phone } from 'lucide-react'
import {
  CustomerActionsProvider,
  CustomerEditButton,
  CustomerOverflowMenu,
  CustomerSharePortalMenu,
  CustomerStartOrderButton,
} from '@/components/admin/customer-home-actions'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import {
  formatCurrency,
  formatDeliveryDate,
  todayISODate,
} from '@/lib/utils'
import { StatusDot } from '@/components/ui/status-dot'
import { StatCard } from '@/components/ui/stat-card'
import { CustomerSettingsInline } from '@/components/admin/customer-settings-inline'
import type { OrderStatus } from '@/lib/types'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const today = todayISODate()

  const [
    { rows: customers },
    { rows: orderHistory },
    { rows: draftRows },
    { rows: statsRows },
  ] = await Promise.all([
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
      access_token: string | null
      show_prices: boolean | null
      custom_pricing: boolean | null
      default_group: string | null
    }>(
      `select id, business_name, contact_name, email, phone, address, city, state, zip, access_token,
              show_prices, custom_pricing, default_group
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
    }>(
      `select id, delivery_date::text, status, total, item_count
       from orders
       where customer_id = $1
       order by delivery_date desc
       limit 5`,
      [id]
    ),
    db.query<{ id: string }>(
      `select id from orders
       where customer_id = $1 and delivery_date = $2 and status = 'draft'
       limit 1`,
      [id, today]
    ),
    db.query<{
      count: number
      spend: string | number | null
      last_date: string | null
    }>(
      `select count(*) filter (where status != 'draft')::int as count,
              coalesce(sum(total) filter (where status != 'draft'), 0) as spend,
              max(delivery_date) filter (where status != 'draft')::text as last_date
       from orders where customer_id = $1`,
      [id]
    ),
  ])

  const customer = customers[0] ?? null
  if (!customer) notFound()

  const customerName = customer.business_name || customer.contact_name || 'Customer'
  const orders = orderHistory ?? []
  const todayDraftId = draftRows[0]?.id ?? null

  const statRow = statsRows[0]
  const lifetimeOrders = statRow?.count ?? 0
  const lifetimeSpend = Number(statRow?.spend ?? 0)
  const lastOrderDate = statRow?.last_date ?? null
  const avgOrder = lifetimeOrders > 0 ? lifetimeSpend / lifetimeOrders : null

  async function startOrder() {
    'use server'
    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()

    const { rows: existing } = await actionDb.query<{ id: string }>(
      `select id from orders
       where customer_id = $1 and delivery_date = $2 and status = 'draft'
       limit 1`,
      [id, today]
    )
    if (existing[0]?.id) {
      redirect(`/admin/orders/${existing[0].id}?returnTo=${encodeURIComponent(`/admin/customers/${id}`)}`)
    }
    const { rows: created } = await actionDb.query<{ id: string }>(
      `insert into orders (customer_id, delivery_date, status)
       values ($1, $2, 'draft')
       returning id`,
      [id, today]
    )
    if (!created[0]?.id) throw new Error('Unable to create draft order')
    redirect(`/admin/orders/${created[0].id}?returnTo=${encodeURIComponent(`/admin/customers/${id}`)}`)
  }

  async function deleteCustomer() {
    'use server'
    await requirePageAuth(['salesman'])
    const actionDb = await getRequestDb()
    await actionDb.query('delete from profiles where id = $1', [id])
    redirect('/admin/customers')
  }

  return (
    <CustomerActionsProvider
      customerId={customer.id}
      accessToken={customer.access_token}
      hasDraftToday={Boolean(todayDraftId)}
      todayLabel={formatDeliveryDate(today)}
      startOrderAction={startOrder}
      deleteCustomerAction={deleteCustomer}
    >
      <div className="mx-auto max-w-lg space-y-6 pt-2">
        {/* Header row: name + visible secondary action icons */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight">
              {customerName}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              <CustomerSharePortalMenu />
              <CustomerEditButton />
              <CustomerOverflowMenu />
            </div>
          </div>

          {customer.contact_name && customer.contact_name !== customerName && (
            <div className="mt-1 text-sm text-muted-foreground">{customer.contact_name}</div>
          )}
        </div>

        {/* Customer details + primary action */}
        <section className="space-y-3">
          {(customer.phone || customer.email || customer.address) && (
            <ul className="divide-y rounded-xl border bg-card text-sm">
              {customer.phone && (
                <li>
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </a>
                </li>
              )}
              {customer.email && (
                <li>
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.email}</span>
                  </a>
                </li>
              )}
              {customer.address && (
                <li className="flex items-start gap-3 px-4 py-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {customer.address}
                    {(customer.city || customer.state || customer.zip) && (
                      <>
                        <br />
                        {[customer.city, customer.state].filter(Boolean).join(', ')}
                        {customer.zip ? ` ${customer.zip}` : ''}
                      </>
                    )}
                  </span>
                </li>
              )}
            </ul>
          )}

          <CustomerStartOrderButton />
        </section>

        {/* Stats grid */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Lifetime orders" value={lifetimeOrders} />
            <StatCard label="Lifetime spend" value={formatCurrency(lifetimeSpend)} />
            <StatCard
              label="Last order"
              value={lastOrderDate ? formatDeliveryDate(lastOrderDate) : '—'}
            />
            <StatCard
              label="Average order"
              value={avgOrder !== null ? formatCurrency(avgOrder) : '—'}
            />
          </div>
        </section>

        {/* Customer settings — inline autosave (row layout) */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Customer settings
          </h2>
          <CustomerSettingsInline
            customerId={customer.id}
            initialShowPrices={customer.show_prices ?? true}
            initialCustomPricing={customer.custom_pricing ?? false}
            initialDefaultGroup={customer.default_group === 'size' ? 'size' : 'brand'}
            layout="row"
          />
        </section>

      {/* Recent orders ledger */}
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent orders
        </h2>
        <ul className="divide-y rounded-xl border bg-card">
          {orders.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No orders yet.</li>
          ) : (
            orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}?returnTo=${encodeURIComponent(`/admin/customers/${id}`)}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <StatusDot status={o.status as OrderStatus} />
                  <span className="text-sm font-medium">{formatDeliveryDate(o.delivery_date)}</span>
                  <span className="ml-auto text-sm tabular-nums">
                    {formatCurrency(o.total ?? 0)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))
          )}
        </ul>
        </section>
      </div>
    </CustomerActionsProvider>
  )
}
