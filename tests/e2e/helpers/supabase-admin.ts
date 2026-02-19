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

/**
 * Look up a salesman auth user by email (auth.users table).
 */
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

/**
 * Look up a customer profile by business name and return the access_token (portal token).
 */
export async function getCustomerToken(businessName: string): Promise<string> {
  const client = adminClient()
  const { data, error } = await client
    .from('profiles')
    .select('access_token')
    .eq('role', 'customer')
    .eq('business_name', businessName)
    .single()

  if (error || !data?.access_token) {
    throw new Error(`Unable to find customer token for "${businessName}": ${error?.message ?? 'no token'}`)
  }

  return data.access_token
}

