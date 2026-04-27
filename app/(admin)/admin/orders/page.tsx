import { DirectoryWorkbench } from '@/components/admin/directory-workbench'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { MomentStream } from '@/components/admin/moment-stream'
import { OrderListRow, type OrderListItem } from '@/components/admin/order-list-row'
import { OrderWorkbench } from '@/components/admin/order-workbench'
import { SegmentedFilters } from '@/components/admin/segmented-filters'
import { PageHeader } from '@/components/ui/page-header'
import { getOrdersPageMoments } from '@/lib/server/admin-prompts'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatCurrency } from '@/lib/utils'

interface AdminOrdersPageProps {
  searchParams?: Promise<{ q?: string; status?: string; id?: string }>
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const resolved = searchParams ? await searchParams : undefined
  const searchQuery = (resolved?.q ?? '').trim()
  const statusFilter = (resolved?.status ?? 'all').trim()
  const selectedId = resolved?.id ?? null

  const [orders, moments] = await Promise.all([
    db.query<{
      id: string
      customer_id: string | null
      customer_name: string | null
      delivery_date: string
      item_count: number | null
      total: number | null
      status: 'draft' | 'submitted' | 'delivered' | 'cancelled'
      updated_at: string
    }>(
      `select
         o.id,
         o.customer_id,
         coalesce(p.business_name, p.contact_name) as customer_name,
         o.delivery_date::text,
         o.item_count,
         o.total,
         o.status,
         o.updated_at::text
       from orders o
       left join profiles p on p.id = o.customer_id
       order by o.delivery_date desc, o.updated_at desc
       limit 200`,
    ),
    getOrdersPageMoments(db),
  ])

  const term = searchQuery.toLowerCase()
  const items: OrderListItem[] = orders.rows
    .filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (!term) return true
      return (o.customer_name ?? '').toLowerCase().includes(term)
    })
    .map((o) => ({
      id: o.id,
      customerName: o.customer_name ?? 'Unknown customer',
      contextLine: buildContextLine(o),
      activityHint: o.delivery_date,
      status: o.status,
    }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description={`${items.length} order${items.length === 1 ? '' : 's'}`}
      />
      <MomentStream moments={moments} />
      <DirectoryWorkbench
        list={
          <div className="space-y-3">
            <LiveQueryInput
              placeholder="Search orders by customer…"
              initialValue={searchQuery}
              className="w-full"
            />
            <SegmentedFilters
              paramKey="status"
              options={[
                { value: 'all', label: 'All' },
                { value: 'draft', label: 'Drafts' },
                { value: 'submitted', label: 'Needs review' },
                { value: 'delivered', label: 'Delivered' },
              ]}
              label="Filter orders by status"
            />
            <ul className="rounded-lg border border-foreground/10">
              {items.map((item) => (
                <li key={item.id}>
                  <OrderListRow order={item} selectedId={selectedId} />
                </li>
              ))}
            </ul>
          </div>
        }
        detail={selectedId ? <OrderWorkbench orderId={selectedId} /> : null}
        emptyDetail={
          <p className="px-2 py-12 text-center text-[14px] text-muted-foreground/70">
            Pick an order to see line items, status, and actions.
          </p>
        }
      />
    </div>
  )
}

function buildContextLine(o: {
  status: 'draft' | 'submitted' | 'delivered' | 'cancelled'
  delivery_date: string
  item_count: number | null
  total: number | null
}): string {
  const itemCount = o.item_count ?? 0
  if (o.status === 'draft') {
    return `Draft · delivers ${o.delivery_date} · ${itemCount} items`
  }
  return `${capitalize(o.status)} · delivers ${o.delivery_date} · ${itemCount} items · ${formatCurrency(Number(o.total ?? 0))}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
