import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ChevronRight, Mail, MapPin, Phone } from 'lucide-react'
import {
  CustomerActionsProvider,
  CustomerOverflowMenu,
  CustomerSharePortalMenu,
  CustomerStartOrderButton,
} from '@/components/admin/customer-home-actions'
import { ApplyPresetMenu } from '@/components/admin/apply-preset-menu'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import {
  formatCurrency,
  formatDeliveryDate,
  todayISODate,
} from '@/lib/utils'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { StatCard } from '@/components/ui/stat-card'
import { CustomerSettingsInline } from '@/components/admin/customer-settings-inline'
import type { OrderStatus } from '@/lib/types'

function summarizeCounts(brand: number, size: number, product: number): string {
  const parts: string[] = []
  if (brand > 0) parts.push(`${brand} brand${brand === 1 ? '' : 's'}`)
  if (size > 0) parts.push(`${size} size${size === 1 ? '' : 's'}`)
  if (product > 0) parts.push(`${product} product${product === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

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
    { rows: presetRows },
    { rows: visibilityRows },
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
    db.query<{
      id: string
      name: string
      brand_count: number
      size_count: number
      product_count: number
    }>(
      `select
         p.id,
         p.name,
         coalesce(b.n, 0)::int as brand_count,
         coalesce(s.n, 0)::int as size_count,
         coalesce(pr.n, 0)::int as product_count
       from presets p
       left join (
         select preset_id, count(*) as n from preset_brand_rules
         where is_hidden or is_pinned group by preset_id
       ) b on b.preset_id = p.id
       left join (
         select preset_id, count(*) as n from preset_size_rules
         where is_hidden group by preset_id
       ) s on s.preset_id = p.id
       left join (
         select preset_id, count(*) as n from preset_product_rules group by preset_id
       ) pr on pr.preset_id = p.id
       order by p.name asc`
    ),
    db.query<{
      brand_count: number
      size_count: number
      product_count: number
    }>(
      `select
         (select count(*) from customer_brands where customer_id = $1 and (is_hidden or is_pinned))::int as brand_count,
         (select count(*) from customer_sizes where customer_id = $1 and is_hidden)::int as size_count,
         (select count(*) from customer_products where customer_id = $1 and (is_hidden or is_pinned))::int as product_count`,
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

  const presetOptions = presetRows.map((row) => ({
    id: row.id,
    name: row.name,
    summary:
      summarizeCounts(row.brand_count, row.size_count, row.product_count) || 'No rules yet',
  }))

  const visibility = visibilityRows[0] ?? { brand_count: 0, size_count: 0, product_count: 0 }
  const visibilitySummary =
    summarizeCounts(visibility.brand_count, visibility.size_count, visibility.product_count) || null
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
      <div className="mx-auto max-w-lg space-y-6 pb-28 pt-2 md:pb-6">
        <PageHeader
          title={customerName}
          description={
            customer.contact_name && customer.contact_name !== customerName
              ? customer.contact_name
              : undefined
          }
          breadcrumb={
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Customers
            </Link>
          }
          actions={
            <>
              <CustomerSharePortalMenu />
              <CustomerOverflowMenu />
            </>
          }
        />

        {/* Customer details */}
        <section className="space-y-3">
          <ul className="divide-y rounded-xl border bg-card text-sm">
            <li className="flex items-center gap-3 px-4 py-3">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {customer.phone}
                </a>
              ) : (
                <span className="text-muted-foreground">No phone</span>
              )}
            </li>
            <li className="flex items-center gap-3 px-4 py-3">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="break-all hover:underline">
                  {customer.email}
                </a>
              ) : (
                <span className="text-muted-foreground">No email</span>
              )}
            </li>
            <li className="flex items-start gap-3 px-4 py-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              {customer.address ? (
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
              ) : (
                <span className="text-muted-foreground">No address</span>
              )}
            </li>
          </ul>
        </section>

        {/* Catalog visibility — apply a preset */}
        <ApplyPresetMenu
          customerId={customer.id}
          customerName={customerName}
          currentSummary={visibilitySummary}
          presets={presetOptions}
        />

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

        {/* Edit settings — inline autosave (row layout) */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Edit settings
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
                  <OrderStatusDot status={o.status as OrderStatus} />
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
      <CustomerStartOrderButton />
    </CustomerActionsProvider>
  )
}
