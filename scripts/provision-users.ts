import { randomUUID, randomBytes } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.generated'

type UserRole = 'customer' | 'salesman'

interface SalesmanSpec {
  email: string
  password: string
  role: 'salesman'
  businessName: string
  contactName: string
}

interface CustomerSpec {
  email?: string
  role: 'customer'
  businessName: string
  contactName: string
}

type UserSpec = SalesmanSpec | CustomerSpec

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function randomPassword() {
  return `Temp-${Math.random().toString(36).slice(2)}-A1!`
}

async function findUserIdByEmail(
  adminClient: SupabaseClient<Database>,
  email: string
): Promise<string | null> {
  let page = 1
  const normalized = email.toLowerCase()

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    })

    if (error) {
      throw new Error(`Unable to list auth users: ${error.message}`)
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

  return null
}

async function ensureSalesman(
  adminClient: SupabaseClient<Database>,
  spec: SalesmanSpec
): Promise<string> {
  const existingId = await findUserIdByEmail(adminClient, spec.email)
  if (existingId) {
    const { error } = await adminClient.auth.admin.updateUserById(existingId, {
      password: spec.password,
      email_confirm: true,
      user_metadata: {
        full_name: spec.contactName,
        role: spec.role,
      },
    })

    if (error) {
      throw new Error(`Failed to update auth user ${spec.email}: ${error.message}`)
    }

    return existingId
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: spec.email,
    password: spec.password,
    email_confirm: true,
    user_metadata: {
      full_name: spec.contactName,
      role: spec.role,
    },
  })

  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${spec.email}: ${error?.message ?? 'unknown error'}`)
  }

  return data.user.id
}

async function ensureCustomer(
  adminClient: SupabaseClient<Database>,
  spec: CustomerSpec,
  envKeyPrefix: string
): Promise<string> {
  // Check if a profile already exists for this customer (by business name)
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id,access_token')
    .eq('role', 'customer')
    .eq('business_name', spec.businessName)
    .maybeSingle()

  if (existingProfile) {
    // Ensure access_token is set
    if (!existingProfile.access_token) {
      const newToken = randomBytes(16).toString('hex')
      await adminClient
        .from('profiles')
        .update({ access_token: newToken })
        .eq('id', existingProfile.id)
      console.log(`  Updated ${spec.businessName} with new access token`)
    }
    return existingProfile.id
  }

  // Create new customer profile (no auth user needed)
  const profileId = randomUUID()
  const accessToken = randomBytes(16).toString('hex')

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: profileId,
    role: 'customer',
    business_name: spec.businessName,
    contact_name: spec.contactName,
    email: spec.email ?? null,
    show_prices: true,
    default_group: 'brand',
    custom_pricing: false,
    access_token: accessToken,
  })

  if (profileError) {
    throw new Error(`Failed to create customer profile ${spec.businessName}: ${profileError.message}`)
  }

  return profileId
}

async function main() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const inboxEmail = process.env.CI_INBOX_EMAIL || 'inbox@ohthatgrp.com'
  const inboxPassword = process.env.CI_INBOX_PASSWORD || process.env.CI_SALESMAN_PASSWORD || randomPassword()

  // --- Salesmen (use Supabase auth) ---
  const salesmen: SalesmanSpec[] = [
    {
      email: requireEnv('CI_SALESMAN_EMAIL'),
      password: requireEnv('CI_SALESMAN_PASSWORD'),
      role: 'salesman',
      businessName: 'Universal Beverages',
      contactName: 'CI Salesman',
    },
    {
      email: inboxEmail,
      password: inboxPassword,
      role: 'salesman',
      businessName: 'Universal Beverages',
      contactName: 'Inbox User',
    },
  ]

  const dedupedSalesmen = new Map<string, SalesmanSpec>()
  for (const spec of salesmen) {
    dedupedSalesmen.set(spec.email.toLowerCase(), spec)
  }

  for (const spec of dedupedSalesmen.values()) {
    const userId = await ensureSalesman(adminClient, spec)
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: userId,
        role: spec.role,
        business_name: spec.businessName,
        contact_name: spec.contactName,
        email: spec.email,
        show_prices: false,
        default_group: 'brand',
        custom_pricing: false,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      throw new Error(`Failed to upsert profile for ${spec.email}: ${profileError.message}`)
    }

    console.log(`Provisioned salesman: ${spec.email}`)
  }

  // --- Customers (no auth user, portal token based) ---
  const customers: CustomerSpec[] = [
    {
      email: process.env.CI_CUSTOMER_A_EMAIL ?? undefined,
      role: 'customer',
      businessName: 'CI Customer A',
      contactName: 'Customer A',
    },
    {
      email: process.env.CI_CUSTOMER_B_EMAIL ?? undefined,
      role: 'customer',
      businessName: 'CI Customer B',
      contactName: 'Customer B',
    },
  ]

  for (const spec of customers) {
    const profileId = await ensureCustomer(adminClient, spec, '')

    // Re-read to get the token for logging
    const { data: profile } = await adminClient
      .from('profiles')
      .select('access_token')
      .eq('id', profileId)
      .single()

    console.log(`Provisioned customer: ${spec.businessName} (token: ${profile?.access_token?.slice(0, 8)}...)`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
