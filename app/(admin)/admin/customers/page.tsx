import { randomBytes, randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { CustomersTableManager, type CustomerListRow } from '@/components/admin/customers-table-manager'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePageAuth } from '@/lib/server/page-auth'

interface CustomersPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const context = await requirePageAuth(['salesman'])
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const [customersResponse, ordersResponse] = await Promise.all([
    context.supabase
      .from('profiles')
      .select('id,business_name,contact_name,email,phone,show_prices,custom_pricing,default_group,access_token')
      .eq('role', 'customer')
      .order('business_name', { ascending: true }),
    context.supabase
      .from('orders')
      .select('customer_id,delivery_date')
      .order('delivery_date', { ascending: false })
      .limit(2000),
  ])

  if (customersResponse.error) {
    throw customersResponse.error
  }

  if (ordersResponse.error) {
    throw ordersResponse.error
  }

  const lastOrderByCustomer = new Map<string, string>()
  for (const order of ordersResponse.data ?? []) {
    if (!order.customer_id || lastOrderByCustomer.has(order.customer_id)) {
      continue
    }
    lastOrderByCustomer.set(order.customer_id, order.delivery_date)
  }

  const customers = (customersResponse.data ?? []).filter((customer) => {
    if (!searchTerm) {
      return true
    }

    const haystack = [
      customer.business_name ?? '',
      customer.contact_name ?? '',
      customer.email ?? '',
      customer.phone ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchTerm)
  })

  async function createCustomer(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])

    const businessName = String(formData.get('business_name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim().toLowerCase() || null

    if (!businessName) {
      throw new Error('Business name is required')
    }

    const adminClient = createAdminClient()

    const profileId = randomUUID()
    const accessToken = randomBytes(16).toString('hex')

    const { error: insertError } = await adminClient.from('profiles').insert({
      id: profileId,
      role: 'customer',
      business_name: businessName || null,
      contact_name: null,
      email,
      phone: null,
      show_prices: true,
      custom_pricing: false,
      default_group: 'brand',
      access_token: accessToken,
    })

    if (insertError) {
      throw insertError
    }

    redirect(`/admin/customers/${profileId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
      </div>

      <div className="space-y-2 sm:flex sm:items-start sm:gap-2 sm:space-y-0">
        <div className="flex items-center gap-2">
          <details className="group rounded-md border">
            <summary className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm font-medium list-none">
              <Plus className="h-3.5 w-3.5" />
              New Customer
            </summary>
            <div className="border-t p-4">
              <form action={createCustomer} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="customer-business-name">Business Name</Label>
                  <Input id="customer-business-name" name="business_name" required placeholder="Acme Beverages" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email (optional)</Label>
                  <Input id="customer-email" name="email" type="email" placeholder="owner@acme.com" />
                </div>
                <Button type="submit">Create</Button>
              </form>
            </div>
          </details>
        </div>
        <div className="flex items-center gap-2">
          <LiveQueryInput
            placeholder="Search customers..."
            initialValue={searchQuery}
            className="w-full sm:w-80"
          />
        </div>
      </div>

      <CustomersTableManager
        rows={customers.map((customer) => {
          const businessName =
            customer.business_name || customer.contact_name || customer.email || customer.id
          const lastOrderDate = customer.id ? lastOrderByCustomer.get(customer.id) ?? null : null
          const portalUrl = customer.access_token ? `/c/${customer.access_token}` : null
          return {
            id: customer.id,
            businessName,
            email: customer.email,
            phone: customer.phone,
            lastOrderDate,
            portalUrl,
          } satisfies CustomerListRow
        })}
      />
    </div>
  )
}
