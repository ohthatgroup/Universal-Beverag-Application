import { randomBytes, randomUUID } from 'crypto'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { CopyUrlButton } from '@/components/admin/copy-url-button'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePageAuth } from '@/lib/server/page-auth'
import { formatDeliveryDate } from '@/lib/utils'

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

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

      <div className="flex flex-wrap items-start gap-2">
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

        <LiveQueryInput
          placeholder="Search customers..."
          initialValue={searchQuery}
          className="w-full sm:w-80"
        />
      </div>

      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No customers found.</p>
      ) : (
        <>
          <div className="space-y-0 md:hidden">
            {customers.map((customer) => {
              const lastOrderDate = customer.id ? lastOrderByCustomer.get(customer.id) : null
              const portalUrl = customer.access_token ? `${appUrl}/c/${customer.access_token}` : null
              return (
                <div key={customer.id} className="border-b py-3 last:border-0">
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {customer.business_name || customer.contact_name || customer.email || customer.id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {customer.email ?? 'No email'}
                        {customer.phone && ` - ${customer.phone}`}
                      </div>
                    </div>
                    <div className="ml-3 whitespace-nowrap text-xs text-muted-foreground">
                      {lastOrderDate ? formatDeliveryDate(lastOrderDate) : 'No orders'}
                    </div>
                  </Link>
                  {portalUrl ? (
                    <div className="mt-2">
                      <CopyUrlButton url={portalUrl} label="Copy URL" />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Business Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Last Order</th>
                  <th className="px-4 py-3 text-right font-medium">Portal</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const lastOrderDate = customer.id ? lastOrderByCustomer.get(customer.id) : null
                  const portalUrl = customer.access_token ? `${appUrl}/c/${customer.access_token}` : null

                  return (
                    <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:underline">
                          {customer.business_name || customer.contact_name || customer.email || customer.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.email ?? '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.phone ?? '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lastOrderDate ? formatDeliveryDate(lastOrderDate) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {portalUrl ? <CopyUrlButton url={portalUrl} label="Copy URL" /> : <span className="text-muted-foreground">-</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
