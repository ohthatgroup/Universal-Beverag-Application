import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.generated'

type UserRole = 'customer' | 'salesman'

interface UserSpec {
  email: string
  password: string
  role: UserRole
  businessName: string
  contactName: string
}

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

async function ensureUser(
  adminClient: SupabaseClient<Database>,
  spec: UserSpec
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

async function main() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const inboxEmail = process.env.CI_INBOX_EMAIL ?? 'inbox@ohthatgrp.com'
  const inboxPassword = process.env.CI_INBOX_PASSWORD ?? process.env.CI_SALESMAN_PASSWORD ?? randomPassword()

  const desiredUsers: UserSpec[] = [
    {
      email: requireEnv('CI_SALESMAN_EMAIL'),
      password: requireEnv('CI_SALESMAN_PASSWORD'),
      role: 'salesman',
      businessName: 'Universal Beverages',
      contactName: 'CI Salesman',
    },
    {
      email: requireEnv('CI_CUSTOMER_A_EMAIL'),
      password: requireEnv('CI_CUSTOMER_A_PASSWORD'),
      role: 'customer',
      businessName: 'CI Customer A',
      contactName: 'Customer A',
    },
    {
      email: requireEnv('CI_CUSTOMER_B_EMAIL'),
      password: requireEnv('CI_CUSTOMER_B_PASSWORD'),
      role: 'customer',
      businessName: 'CI Customer B',
      contactName: 'Customer B',
    },
    {
      email: inboxEmail,
      password: inboxPassword,
      role: 'salesman',
      businessName: 'Universal Beverages',
      contactName: 'Inbox User',
    },
  ]

  const deduped = new Map<string, UserSpec>()
  for (const spec of desiredUsers) {
    deduped.set(spec.email.toLowerCase(), spec)
  }

  for (const spec of deduped.values()) {
    const userId = await ensureUser(adminClient, spec)
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: userId,
        role: spec.role,
        business_name: spec.businessName,
        contact_name: spec.contactName,
        email: spec.email,
        show_prices: spec.role === 'customer',
        default_group: 'brand',
        custom_pricing: false,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      throw new Error(`Failed to upsert profile for ${spec.email}: ${profileError.message}`)
    }

    console.log(`Provisioned ${spec.email} (${spec.role})`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
