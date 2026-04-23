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

/**
 * Look up a customer profile by business name and return its id.
 */
export async function getCustomerIdByName(businessName: string): Promise<string> {
  return withDb(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `select id
       from profiles
       where role = 'customer'
         and business_name = $1
       limit 1`,
      [businessName]
    )

    const id = rows[0]?.id
    if (!id) {
      throw new Error(`Unable to find customer id for "${businessName}"`)
    }

    return id
  })
}

/**
 * Look up the latest submitted order id for a customer business name.
 */
export async function getSubmittedOrderIdByCustomerName(businessName: string): Promise<string> {
  return withDb(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `select o.id
       from orders o
       join profiles p on p.id = o.customer_id
       where p.role = 'customer'
         and p.business_name = $1
         and o.status = 'submitted'
       order by o.delivery_date desc, o.created_at desc, o.id desc
       limit 1`,
      [businessName]
    )

    const id = rows[0]?.id
    if (!id) {
      throw new Error(`Unable to find submitted order for "${businessName}"`)
    }

    return id
  })
}
