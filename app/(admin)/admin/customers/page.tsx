import type { SupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePageAuth } from '@/lib/server/page-auth'
import type { Database } from '@/lib/types'
import { formatDeliveryDate } from '@/lib/utils'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AdminClient = SupabaseClient<Database>

interface CustomersPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

function randomPassword(): string {
  return `Temp-${Math.random().toString(36).slice(2)}-A1!`
}

async function findUserIdByEmail(adminClient: AdminClient, email: string): Promise<string | null> {
  let page = 1
  const normalizedEmail = email.toLowerCase()

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 })

    if (error) {
      throw error
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail)
    if (match) {
      return match.id
    }

    if (data.users.length < 200) {
      return null
    }

    page += 1
  }
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const context = await requirePageAuth(['salesman'])
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

  const [customersResponse, ordersResponse] = await Promise.all([
    context.supabase
      .from('profiles')
      .select('id,business_name,contact_name,email,phone,show_prices,custom_pricing,default_group')
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

    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase()
    const contactName = String(formData.get('contact_name') ?? '').trim()
    const businessName = String(formData.get('business_name') ?? '').trim()
    const phone = String(formData.get('phone') ?? '').trim()

    if (!emailRegex.test(email)) {
      throw new Error('A valid email is required')
    }

    const adminClient = createAdminClient()
    let userId = await findUserIdByEmail(adminClient, email)

    if (userId) {
      const { error: updateUserError } = await adminClient.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: {
          full_name: contactName || undefined,
          role: 'customer',
        },
      })

      if (updateUserError) {
        throw updateUserError
      }
    } else {
      const { data, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: {
          full_name: contactName || undefined,
          role: 'customer',
        },
      })

      if (createUserError || !data.user) {
        throw createUserError ?? new Error('Unable to create auth user')
      }

      userId = data.user.id
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfileError) {
      throw existingProfileError
    }

    if (existingProfile?.role === 'salesman') {
      throw new Error('This email belongs to a salesman account and cannot be converted to a customer.')
    }

    const { error: upsertProfileError } = await adminClient.from('profiles').upsert(
      {
        id: userId,
        role: 'customer',
        business_name: businessName || null,
        contact_name: contactName || null,
        email,
        phone: phone || null,
        show_prices: true,
        custom_pricing: false,
        default_group: 'brand',
      },
      { onConflict: 'id' }
    )

    if (upsertProfileError) {
      throw upsertProfileError
    }

    redirect(`/admin/customers/${userId}`)
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      <h1 className="text-2xl font-semibold">Customers</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCustomer} className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input id="customer-email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-business-name">Business Name</Label>
              <Input id="customer-business-name" name="business_name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-contact-name">Contact Name</Label>
              <Input id="customer-contact-name" name="contact_name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input id="customer-phone" name="phone" />
            </div>
            <Button type="submit">Create Customer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <form method="GET" className="flex gap-2">
            <Input name="q" placeholder="Search customers..." defaultValue={searchQuery} />
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {customers.map((customer) => {
          const lastOrderDate = customer.id ? lastOrderByCustomer.get(customer.id) : null
          return (
            <Card key={customer.id}>
              <CardContent className="space-y-2 pt-4 text-sm">
                <div className="font-medium">{customer.business_name || customer.contact_name || customer.id}</div>
                <div className="text-xs text-muted-foreground">Phone: {customer.phone ?? 'No phone'}</div>
                <div className="text-xs text-muted-foreground">{customer.email ?? 'No email'}</div>
                <div className="text-xs text-muted-foreground">
                  Last order: {lastOrderDate ? formatDeliveryDate(lastOrderDate) : 'No orders yet'}
                </div>
                <div className="text-xs text-muted-foreground">
                  show_prices={String(customer.show_prices)} • custom_pricing={String(customer.custom_pricing)} •
                  default_group={customer.default_group}
                </div>
                <div className="flex gap-3">
                  <Link className="text-xs underline" href={`/admin/customers/${customer.id}`}>
                    Details
                  </Link>
                  <Link className="text-xs underline" href={`/admin/customers/${customer.id}/products`}>
                    Products
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {customers.length === 0 && <p className="text-sm text-muted-foreground">No customers available.</p>}
      </div>
    </div>
  )
}
