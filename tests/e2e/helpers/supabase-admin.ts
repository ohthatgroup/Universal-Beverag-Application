import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function adminClient() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function getUserIdByEmail(email: string): Promise<string> {
  const client = adminClient()
  let page = 1
  const normalized = email.toLowerCase()

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 200,
    })

    if (error) {
      throw new Error(`Unable to list users: ${error.message}`)
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized)
    if (match) {
      return match.id
    }

    if (data.users.length < 200) {
      break
    }
    page += 1
  }

  throw new Error(`Unable to find user by email: ${email}`)
}

export async function findOrderId(customerId: string, deliveryDate: string): Promise<string> {
  const client = adminClient()
  const { data, error } = await client
    .from('orders')
    .select('id')
    .eq('customer_id', customerId)
    .eq('delivery_date', deliveryDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    throw new Error(`Unable to find order for ${customerId} on ${deliveryDate}: ${error?.message ?? 'not found'}`)
  }

  return data.id
}

export async function getOrderStatus(orderId: string): Promise<string> {
  const client = adminClient()
  const { data, error } = await client
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    throw new Error(`Unable to read order status for ${orderId}: ${error?.message ?? 'not found'}`)
  }

  return data.status
}
