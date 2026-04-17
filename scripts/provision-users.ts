import { randomBytes, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { Client } from 'pg'

interface SalesmanSpec {
  email: string
  role: 'salesman'
  businessName: string
  contactName: string
}

interface CustomerFixtureSpec {
  email?: string
  role: 'customer'
  businessName: string
  contactName: string
}

interface ProvisionReport {
  salesmen: {
    created: number
    updated: number
  }
  customers: {
    created: number
    updated: number
    tokensCreated: number
    authLinksCreated: number
  }
}

function loadLocalEnvFiles() {
  if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env')
  }

  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local')
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function resolveDbUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  ).trim()
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error) {
    return error
  }
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error)
}

function extractAuthUserId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>

  const direct =
    (typeof record.id === 'string' && record.id) ||
    (typeof record.user_id === 'string' && record.user_id) ||
    null
  if (direct) return direct

  const data = record.data
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>
    if (typeof nested.id === 'string') return nested.id
    if (typeof nested.user_id === 'string') return nested.user_id
    const user = nested.user
    if (user && typeof user === 'object') {
      const userRecord = user as Record<string, unknown>
      if (typeof userRecord.id === 'string') return userRecord.id
      if (typeof userRecord.user_id === 'string') return userRecord.user_id
    }
  }

  const user = record.user
  if (user && typeof user === 'object') {
    const userRecord = user as Record<string, unknown>
    if (typeof userRecord.id === 'string') return userRecord.id
    if (typeof userRecord.user_id === 'string') return userRecord.user_id
  }

  return null
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>

  if (typeof record.message === 'string' && record.message) {
    return record.message
  }

  const error = record.error
  if (error && typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>
    if (typeof errorRecord.message === 'string' && errorRecord.message) {
      return errorRecord.message
    }
  }

  return null
}

function isExistingUserFailure(status: number, payload: unknown) {
  if (status === 409) return true
  const message = extractErrorMessage(payload)?.toLowerCase() ?? ''
  return message.includes('already exists') || message.includes('already registered')
}

async function lookupNeonAuthUserId(client: Client, email: string) {
  const { rows } = await client.query<{ id: string }>(
    `select id::text
     from neon_auth."user"
     where lower(email) = lower($1)
     order by "createdAt" desc
     limit 1`,
    [email]
  )

  return rows[0]?.id ?? null
}

async function waitForNeonAuthUserId(client: Client, email: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = await lookupNeonAuthUserId(client, email)
    if (id) return id
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
  }
  return null
}

async function createNeonAuthUser(email: string, name: string) {
  const apiKey = requireEnv('NEON_API_KEY')
  const projectId = requireEnv('NEON_PROJECT_ID')
  const branchId = requireEnv('NEON_BRANCH_ID')

  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/auth/users`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
      }),
    }
  )

  const payload = (await response.json().catch(() => null)) as unknown
  return {
    ok: response.ok,
    status: response.status,
    payload,
    authUserId: extractAuthUserId(payload),
  }
}

async function ensureNeonAuthUser(client: Client, email: string, name: string) {
  const normalizedEmail = email.trim().toLowerCase()

  let authUserId: string | null = await lookupNeonAuthUserId(client, normalizedEmail)
  if (authUserId) {
    return authUserId
  }

  const created = await createNeonAuthUser(normalizedEmail, name.trim() || normalizedEmail)
  if (!created.ok) {
    if (isExistingUserFailure(created.status, created.payload)) {
      const recovered = await waitForNeonAuthUserId(client, normalizedEmail)
      if (recovered) return recovered
    }

    const message = extractErrorMessage(created.payload) ?? 'Failed to create Neon Auth user'
    throw new Error(message)
  }

  authUserId = created.authUserId ?? (await waitForNeonAuthUserId(client, normalizedEmail))
  if (!authUserId) {
    throw new Error('Neon Auth user was created but could not be resolved from Neon auth records')
  }

  return authUserId as string
}

async function upsertSalesmanProfile(
  client: Client,
  spec: SalesmanSpec
): Promise<'created' | 'updated'> {
  const authUserId = await ensureNeonAuthUser(client, spec.email, spec.contactName)
  const { rows: existing } = await client.query<{ id: string }>(
    `select id
     from profiles
     where auth_user_id = $1 or lower(coalesce(email, '')) = lower($2)
     order by created_at asc
     limit 1`,
    [authUserId, spec.email]
  )

  const existingId = existing[0]?.id
  if (existingId) {
    await client.query(
      `update profiles
       set auth_user_id = $2,
           role = 'salesman',
           business_name = $3,
           contact_name = $4,
           email = $5,
           show_prices = false,
           custom_pricing = false,
           default_group = 'brand',
           updated_at = now()
       where id = $1`,
      [existingId, authUserId, spec.businessName, spec.contactName, spec.email]
    )
    return 'updated'
  }

  await client.query(
    `insert into profiles (
       id, auth_user_id, role, business_name, contact_name, email, show_prices, custom_pricing, default_group
     ) values (
       $1, $2, 'salesman', $3, $4, $5, false, false, 'brand'
     )`,
    [randomUUID(), authUserId, spec.businessName, spec.contactName, spec.email]
  )

  return 'created'
}

async function ensureCustomerFixture(
  client: Client,
  spec: CustomerFixtureSpec
): Promise<{ status: 'created' | 'updated'; tokenCreated: boolean }> {
  const { rows: existing } = await client.query<{ id: string; access_token: string | null }>(
    `select id, access_token
     from profiles
     where role = 'customer'
       and business_name = $1
     limit 1`,
    [spec.businessName]
  )

  if (existing[0]) {
    const token = existing[0].access_token ?? randomBytes(16).toString('hex')
    await client.query(
      `update profiles
       set email = coalesce($2, email),
           contact_name = $3,
           show_prices = true,
           custom_pricing = false,
           default_group = 'brand',
           access_token = coalesce(access_token, $4),
           updated_at = now()
       where id = $1`,
      [existing[0].id, spec.email?.toLowerCase() ?? null, spec.contactName, token]
    )
    return { status: 'updated', tokenCreated: existing[0].access_token === null }
  }

  await client.query(
    `insert into profiles (
       id, role, business_name, contact_name, email, show_prices, custom_pricing, default_group, access_token
     ) values (
       $1, 'customer', $2, $3, $4, true, false, 'brand', $5
     )`,
    [
      randomUUID(),
      spec.businessName,
      spec.contactName,
      spec.email?.toLowerCase() ?? null,
      randomBytes(16).toString('hex'),
    ]
  )

  return { status: 'created', tokenCreated: true }
}

async function ensureCustomerAuthLinks(client: Client) {
  const report = {
    authLinksCreated: 0,
    tokensCreated: 0,
  }

  const { rows } = await client.query<{
    id: string
    business_name: string | null
    email: string | null
    access_token: string | null
    auth_user_id: string | null
  }>(
    `select id, business_name, email, access_token, auth_user_id
     from profiles
     where role = 'customer'`
  )

  for (const row of rows) {
    if (!row.access_token) {
      await client.query(
        `update profiles
         set access_token = $2, updated_at = now()
         where id = $1`,
        [row.id, randomBytes(16).toString('hex')]
      )
      report.tokensCreated += 1
    }

    const email = row.email?.trim().toLowerCase()
    if (!email || row.auth_user_id) {
      continue
    }

    const authUserId = await ensureNeonAuthUser(client, email, row.business_name ?? email)
    await client.query(
      `update profiles
       set auth_user_id = $2, updated_at = now()
       where id = $1`,
      [row.id, authUserId]
    )
    report.authLinksCreated += 1
  }

  return report
}

async function main() {
  loadLocalEnvFiles()

  const dbUrl = resolveDbUrl()
  if (!dbUrl) {
    throw new Error('Missing database connection. Set DATABASE_URL or POSTGRES_URL_NON_POOLING or POSTGRES_URL.')
  }

  const report: ProvisionReport = {
    salesmen: {
      created: 0,
      updated: 0,
    },
    customers: {
      created: 0,
      updated: 0,
      tokensCreated: 0,
      authLinksCreated: 0,
    },
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const salesmen: SalesmanSpec[] = [
      {
        email: requireEnv('CI_SALESMAN_EMAIL').toLowerCase(),
        role: 'salesman',
        businessName: 'Universal Beverages',
        contactName: 'CI Salesman',
      },
      {
        email: (process.env.CI_INBOX_EMAIL || 'inbox@ohthatgrp.com').toLowerCase(),
        role: 'salesman',
        businessName: 'Universal Beverages',
        contactName: 'Inbox User',
      },
    ]

    for (const salesman of salesmen) {
      const result = await upsertSalesmanProfile(client, salesman)
      report.salesmen[result] += 1
      console.log(`Provisioned salesman: ${salesman.email}`)
    }

    const fixtureCustomers: CustomerFixtureSpec[] = [
      {
        email: process.env.CI_CUSTOMER_A_EMAIL?.trim().toLowerCase() || undefined,
        role: 'customer',
        businessName: 'CI Customer A',
        contactName: 'Customer A',
      },
      {
        email: process.env.CI_CUSTOMER_B_EMAIL?.trim().toLowerCase() || undefined,
        role: 'customer',
        businessName: 'CI Customer B',
        contactName: 'Customer B',
      },
    ]

    for (const customer of fixtureCustomers) {
      const result = await ensureCustomerFixture(client, customer)
      report.customers[result.status] += 1
      if (result.tokenCreated) {
        report.customers.tokensCreated += 1
      }
      console.log(`Provisioned customer fixture: ${customer.businessName}`)
    }

    const customerLinkReport = await ensureCustomerAuthLinks(client)
    report.customers.tokensCreated += customerLinkReport.tokensCreated
    report.customers.authLinksCreated += customerLinkReport.authLinksCreated

    console.log(JSON.stringify(report, null, 2))
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(formatError(error))
  process.exit(1)
})
