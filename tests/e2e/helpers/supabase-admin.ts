import { Client } from 'pg'

function resolveDbUrl(): string {
  const direct = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
    process.env.SUPABASE_DB_URL,
  ]
    .map((value) => value?.trim())
    .find(Boolean)

  if (!direct) {
    throw new Error(
      'Missing database connection. Set DATABASE_URL or POSTGRES_URL_NON_POOLING before running Playwright certification.'
    )
  }

  return direct
}

async function withDb<T>(callback: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: resolveDbUrl() })
  await client.connect()

  try {
    return await callback(client)
  } finally {
    await client.end()
  }
}

/**
 * Look up a customer profile by business name and return the access_token (portal token).
 */
export async function getCustomerToken(businessName: string): Promise<string> {
  return withDb(async (client) => {
    const { rows } = await client.query<{ access_token: string | null }>(
      `select access_token
       from profiles
       where role = 'customer'
         and business_name = $1
       limit 1`,
      [businessName]
    )

    const token = rows[0]?.access_token?.trim()
    if (!token) {
      throw new Error(`Unable to find customer token for "${businessName}"`)
    }

    return token
  })
}

