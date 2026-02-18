import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderLinkActions } from '@/components/admin/order-link-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requirePageAuth } from '@/lib/server/page-auth'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/types'
import { formatCurrency, formatDeliveryDate, getStatusVariant, todayISODate } from '@/lib/utils'

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
    <div className="space-y-4 p-4 pb-20">
      <h1 className="text-2xl font-semibold">Orders</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Customer Draft Order</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAdminDraftOrder} className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer</Label>
              <select
                id="customer_id"
                name="customer_id"
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
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
              {customers.length === 0 ? 'Create a customer first' : 'Create / Open Draft'}
            </Button>
          </form>
        </CardContent>
      </Card>

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

      <Card>
        <CardContent className="pt-4">
          <form method="GET" className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            {selectedStatus !== 'all' && <input type="hidden" name="status" value={selectedStatus} />}
            <Input name="q" placeholder="Search by customer..." defaultValue={searchQuery} />
            <Input name="deliveryDate" type="date" defaultValue={selectedDeliveryDate} />
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {dateGroups.map(([deliveryDate, dateOrders]) => (
          <section key={deliveryDate} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{formatDeliveryDate(deliveryDate)}</h2>
            {dateOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {(order.customer_id ? customerById.get(order.customer_id) : null) ??
                          order.customer_id ??
                          'Unknown customer'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.item_count ?? 0} items • {formatCurrency(order.total ?? 0)}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(asOrderStatus(order.status))}>{order.status}</Badge>
                  </div>

                  <div className="flex gap-2 text-sm">
                    <Link className="underline" href={`/admin/orders/${order.id}`}>
                      Open
                    </Link>
                    <a className="underline" href={`/api/orders/${order.id}/csv`}>
                      CSV
                    </a>
                  </div>
                  <OrderLinkActions orderId={order.id} />
                </CardContent>
              </Card>
            ))}
          </section>
        ))}

        {dateGroups.length === 0 && <p className="text-sm text-muted-foreground">No orders found.</p>}
      </div>
    </div>
  )
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'draft'
}
