import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Search, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OrderLinkActions } from '@/components/admin/order-link-actions'
import { requirePageAuth } from '@/lib/server/page-auth'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/types'
import { formatCurrency, formatDeliveryDate, getStatusIcon, getStatusLabel, todayISODate } from '@/lib/utils'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

interface AdminOrdersPageProps {
  searchParams?: Promise<{
    q?: string
    status?: string
    deliveryDate?: string
  }>
}

function normalizeStatus(value: string | undefined): OrderStatus | 'all' {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'all'
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const context = await requirePageAuth(['salesman'])
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()
  const selectedStatus = normalizeStatus(resolvedSearchParams?.status)
  const selectedDeliveryDate =
    resolvedSearchParams?.deliveryDate && isoDateRegex.test(resolvedSearchParams.deliveryDate)
      ? resolvedSearchParams.deliveryDate
      : ''

  const [ordersResponse, customersResponse] = await Promise.all([
    context.supabase
      .from('orders')
      .select('*')
      .order('delivery_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    context.supabase
      .from('profiles')
      .select('id,business_name,contact_name,email')
      .eq('role', 'customer')
      .order('business_name', { ascending: true }),
  ])

  if (ordersResponse.error) {
    throw ordersResponse.error
  }

  if (customersResponse.error) {
    throw customersResponse.error
  }

  const customers = customersResponse.data ?? []
  const customerById = new Map(
    customers.map((customer) => [
      customer.id,
      customer.business_name || customer.contact_name || customer.email || customer.id,
    ])
  )

  const filteredOrders = (ordersResponse.data ?? []).filter((order) => {
    if (selectedStatus !== 'all' && order.status !== selectedStatus) {
      return false
    }

    if (selectedDeliveryDate && order.delivery_date !== selectedDeliveryDate) {
      return false
    }

    if (searchTerm) {
      const customerLabel = ((order.customer_id ? customerById.get(order.customer_id) : null) ?? '')
        .toLowerCase()
      if (!customerLabel.includes(searchTerm)) {
        return false
      }
    }

    return true
  })

  const ordersByDate = new Map<string, typeof filteredOrders>()
  for (const order of filteredOrders) {
    const bucket = ordersByDate.get(order.delivery_date)
    if (bucket) {
      bucket.push(order)
    } else {
      ordersByDate.set(order.delivery_date, [order])
    }
  }

  const dateGroups = Array.from(ordersByDate.entries()).sort(([left], [right]) =>
    left < right ? 1 : left > right ? -1 : 0
  )

  async function createAdminDraftOrder(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])

    const customerId = String(formData.get('customer_id') ?? '').trim()
    const deliveryDate = String(formData.get('delivery_date') ?? '').trim()

    if (!customerId) {
      throw new Error('Customer is required')
    }

    if (!isoDateRegex.test(deliveryDate)) {
      throw new Error('Delivery date must use YYYY-MM-DD format')
    }

    const supabase = await createClient()
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', customerId)
      .eq('role', 'customer')
      .maybeSingle()

    if (customerError) {
      throw customerError
    }

    if (!customer) {
      throw new Error('Customer not found')
    }

    const { data: existingDraft, error: existingDraftError } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', customerId)
      .eq('delivery_date', deliveryDate)
      .eq('status', 'draft')
      .maybeSingle()

    if (existingDraftError) {
      throw existingDraftError
    }

    if (existingDraft?.id) {
      redirect(`/admin/orders/${existingDraft.id}`)
    }

    const { data: createdOrder, error: createOrderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        delivery_date: deliveryDate,
        status: 'draft',
      })
      .select('id')
      .single()

    if (createOrderError || !createdOrder) {
      throw createOrderError ?? new Error('Unable to create draft order')
    }

    redirect(`/admin/orders/${createdOrder.id}`)
  }

  const statusTabs: Array<{ label: string; value: 'all' | OrderStatus }> = [
    { label: 'All', value: 'all' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Drafts', value: 'draft' },
    { label: 'Delivered', value: 'delivered' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
      </div>

      {/* Create order — collapsible */}
      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-medium text-sm">
          <Plus className="h-4 w-4" />
          New Draft Order
        </summary>
        <div className="border-t p-4">
          <form action={createAdminDraftOrder} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer</Label>
              <select
                id="customer_id"
                name="customer_id"
                required
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Select customer
                </option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.business_name || customer.contact_name || customer.email || customer.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input id="delivery_date" name="delivery_date" type="date" required defaultValue={todayISODate()} />
            </div>
            <Button type="submit" disabled={customers.length === 0}>
              {customers.length === 0 ? 'Create a customer first' : 'Create Draft'}
            </Button>
          </form>
        </div>
      </details>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Button key={tab.value} asChild size="sm" variant={selectedStatus === tab.value ? 'default' : 'outline'}>
            <Link
              href={{
                pathname: '/admin/orders',
                query: {
                  ...(tab.value !== 'all' ? { status: tab.value } : {}),
                  ...(searchQuery ? { q: searchQuery } : {}),
                  ...(selectedDeliveryDate ? { deliveryDate: selectedDeliveryDate } : {}),
                },
              }}
            >
              {tab.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Search + date filter — no Card wrapper */}
      <form method="GET" className="flex flex-col gap-2 md:flex-row">
        {selectedStatus !== 'all' && <input type="hidden" name="status" value={selectedStatus} />}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" placeholder="Search by customer..." defaultValue={searchQuery} className="pl-9" />
        </div>
        <Input name="deliveryDate" type="date" defaultValue={selectedDeliveryDate} className="md:w-44" />
        <Button type="submit">Apply</Button>
      </form>

      {/* Orders grouped by date */}
      {dateGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders found.</p>
      ) : (
        <div className="space-y-6">
          {dateGroups.map(([deliveryDate, dateOrders]) => (
            <section key={deliveryDate} className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {formatDeliveryDate(deliveryDate)}
              </h2>

              {/* Mobile cards */}
              <div className="space-y-0 md:hidden">
                {dateOrders.map((order) => (
                  <div key={order.id} className="border-b py-3 last:border-0">
                    <Link href={`/admin/orders/${order.id}`} className="block">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">
                            {(order.customer_id ? customerById.get(order.customer_id) : null) ??
                              'Unknown customer'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.item_count ?? 0} items · {formatCurrency(order.total ?? 0)}
                          </div>
                        </div>
                        <span className="ml-3 text-sm">
                          {getStatusIcon(asOrderStatus(order.status))} {getStatusLabel(asOrderStatus(order.status))}
                        </span>
                      </div>
                    </Link>
                    <div className="mt-2 flex gap-2">
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <a href={`/api/orders/${order.id}/csv`}>
                          <Download className="mr-1 h-3 w-3" />
                          CSV
                        </a>
                      </Button>
                      <OrderLinkActions orderId={order.id} className="flex-1" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Customer</th>
                      <th className="px-4 py-3 text-right font-medium">Items</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateOrders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                            {(order.customer_id ? customerById.get(order.customer_id) : null) ??
                              'Unknown customer'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{order.item_count ?? 0}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(order.total ?? 0)}</td>
                        <td className="px-4 py-3">
                          {getStatusIcon(asOrderStatus(order.status))} {getStatusLabel(asOrderStatus(order.status))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild size="sm" variant="ghost">
                              <a href={`/api/orders/${order.id}/csv`}>
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <OrderLinkActions orderId={order.id} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'draft'
}
