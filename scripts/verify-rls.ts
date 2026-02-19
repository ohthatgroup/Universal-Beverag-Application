import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.generated'

interface CheckResult {
  name: string
  pass: boolean
  details?: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return date.toISOString().slice(0, 10)
}

async function signInClient(
  url: string,
  anonKey: string,
  email: string,
  password: string
) {
  const client = createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`Unable to sign in ${email}: ${error.message}`)
  }
  return client
}

async function main() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const salesmanEmail = requireEnv('CI_SALESMAN_EMAIL')
  const salesmanPassword = requireEnv('CI_SALESMAN_PASSWORD')

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Find customer profiles (no auth users — customers use portal tokens)
  const { data: customerA } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'customer')
    .eq('business_name', 'CI Customer A')
    .single()

  const { data: customerB } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'customer')
    .eq('business_name', 'CI Customer B')
    .single()

  if (!customerA || !customerB) {
    throw new Error('Missing CI customer profiles. Run provision-users.ts first.')
  }

  const customerAId = customerA.id
  const customerBId = customerB.id

  const today = new Date().toISOString().slice(0, 10)
  const customerADate = addDays(today, 28)
  const customerBDate = addDays(today, 29)

  const { error: cleanupError } = await admin
    .from('orders')
    .delete()
    .in('customer_id', [customerAId, customerBId])
    .in('delivery_date', [customerADate, customerBDate])

  if (cleanupError) {
    throw new Error(`Failed to cleanup orders: ${cleanupError.message}`)
  }

  const { data: product, error: productError } = await admin
    .from('products')
    .select('id,price')
    .limit(1)
    .single()

  if (productError || !product) {
    throw new Error(`Missing seed products for RLS verification: ${productError?.message ?? 'no product'}`)
  }

  // Create test orders via admin client (same as portal API does)
  const { data: orderA, error: orderAError } = await admin
    .from('orders')
    .insert({
      customer_id: customerAId,
      delivery_date: customerADate,
      status: 'draft',
    })
    .select('id')
    .single()

  if (orderAError || !orderA) {
    throw new Error(`Failed to create customer A order: ${orderAError?.message ?? 'unknown error'}`)
  }

  const { data: orderB, error: orderBError } = await admin
    .from('orders')
    .insert({
      customer_id: customerBId,
      delivery_date: customerBDate,
      status: 'draft',
    })
    .select('id')
    .single()

  if (orderBError || !orderB) {
    throw new Error(`Failed to create customer B order: ${orderBError?.message ?? 'unknown error'}`)
  }

  const { error: orderItemsError } = await admin.from('order_items').insert([
    {
      order_id: orderA.id,
      product_id: product.id,
      quantity: 2,
      unit_price: product.price ?? 0,
    },
    {
      order_id: orderB.id,
      product_id: product.id,
      quantity: 3,
      unit_price: product.price ?? 0,
    },
  ])

  if (orderItemsError) {
    throw new Error(`Failed to seed order items: ${orderItemsError.message}`)
  }

  // Sign in as salesman (only auth user type remaining)
  const salesmanClient = await signInClient(supabaseUrl, anonKey, salesmanEmail, salesmanPassword)

  // Anonymous client (simulates unauthenticated access)
  const anonClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const checks: CheckResult[] = []
  const record = (name: string, pass: boolean, details?: string) => checks.push({ name, pass, details })

  // -- Salesman RLS checks --

  const salesmanReadsAll = await salesmanClient
    .from('orders')
    .select('id')
    .in('id', [orderA.id, orderB.id])
  record(
    'salesman_reads_all_orders',
    !salesmanReadsAll.error && (salesmanReadsAll.data?.length ?? 0) === 2,
    salesmanReadsAll.error?.message
  )

  const salesmanUpdates = await salesmanClient
    .from('orders')
    .update({ status: 'delivered' })
    .eq('id', orderB.id)
    .select('id,status')
  record(
    'salesman_updates_customer_order',
    !salesmanUpdates.error && salesmanUpdates.data?.[0]?.status === 'delivered',
    salesmanUpdates.error?.message
  )

  const salesmanReadsProfiles = await salesmanClient
    .from('profiles')
    .select('id')
    .eq('role', 'customer')
  record(
    'salesman_reads_customer_profiles',
    !salesmanReadsProfiles.error && (salesmanReadsProfiles.data?.length ?? 0) >= 2,
    salesmanReadsProfiles.error?.message
  )

  // -- Anonymous client checks (should have NO access) --

  const anonOrderRead = await anonClient
    .from('orders')
    .select('id')
    .in('id', [orderA.id, orderB.id])
  record(
    'anon_cannot_read_orders',
    !anonOrderRead.error && (anonOrderRead.data?.length ?? 0) === 0,
    anonOrderRead.error?.message ?? `found ${anonOrderRead.data?.length ?? 0} orders`
  )

  const anonProfileRead = await anonClient
    .from('profiles')
    .select('id')
  record(
    'anon_cannot_read_profiles',
    !anonProfileRead.error && (anonProfileRead.data?.length ?? 0) === 0,
    anonProfileRead.error?.message ?? `found ${anonProfileRead.data?.length ?? 0} profiles`
  )

  // -- Admin client checks (portal API uses service role, bypasses RLS) --

  const adminReadsAll = await admin
    .from('orders')
    .select('id')
    .in('id', [orderA.id, orderB.id])
  record(
    'admin_client_reads_all_orders',
    !adminReadsAll.error && (adminReadsAll.data?.length ?? 0) === 2,
    adminReadsAll.error?.message
  )

  const failures = checks.filter((check) => !check.pass)

  console.log(JSON.stringify({ checks }, null, 2))

  if (failures.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
