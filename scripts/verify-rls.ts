import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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

async function findUserIdByEmail(
  adminClient: SupabaseClient<Database>,
  email: string
): Promise<string> {
  let page = 1
  const normalizedEmail = email.toLowerCase()

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    })

    if (error) {
      throw new Error(`Unable to list auth users: ${error.message}`)
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail)
    if (match) {
      return match.id
    }

    if (data.users.length < 200) {
      break
    }
    page += 1
  }

  throw new Error(`No auth user found for ${email}`)
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

  const customerAEmail = requireEnv('CI_CUSTOMER_A_EMAIL')
  const customerAPassword = requireEnv('CI_CUSTOMER_A_PASSWORD')
  const customerBEmail = requireEnv('CI_CUSTOMER_B_EMAIL')
  const customerBPassword = requireEnv('CI_CUSTOMER_B_PASSWORD')
  const salesmanEmail = requireEnv('CI_SALESMAN_EMAIL')
  const salesmanPassword = requireEnv('CI_SALESMAN_PASSWORD')

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const [customerAId, customerBId] = await Promise.all([
    findUserIdByEmail(admin, customerAEmail),
    findUserIdByEmail(admin, customerBEmail),
  ])

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

  const customerAClient = await signInClient(supabaseUrl, anonKey, customerAEmail, customerAPassword)
  const customerBClient = await signInClient(supabaseUrl, anonKey, customerBEmail, customerBPassword)
  const salesmanClient = await signInClient(supabaseUrl, anonKey, salesmanEmail, salesmanPassword)

  const checks: CheckResult[] = []
  const record = (name: string, pass: boolean, details?: string) => checks.push({ name, pass, details })

  const ownOrderRead = await customerAClient
    .from('orders')
    .select('id')
    .eq('id', orderA.id)
  record(
    'customer_a_reads_own_order',
    !ownOrderRead.error && (ownOrderRead.data?.length ?? 0) === 1,
    ownOrderRead.error?.message
  )

  const foreignOrderRead = await customerAClient
    .from('orders')
    .select('id')
    .eq('id', orderB.id)
  record(
    'customer_a_cannot_read_customer_b_order',
    !foreignOrderRead.error && (foreignOrderRead.data?.length ?? 0) === 0,
    foreignOrderRead.error?.message
  )

  const ownOrderUpdate = await customerAClient
    .from('orders')
    .update({ status: 'submitted' })
    .eq('id', orderA.id)
    .select('id,status')
  record(
    'customer_a_updates_own_draft',
    !ownOrderUpdate.error && ownOrderUpdate.data?.[0]?.status === 'submitted',
    ownOrderUpdate.error?.message
  )

  const foreignOrderUpdate = await customerAClient
    .from('orders')
    .update({ status: 'submitted' })
    .eq('id', orderB.id)
    .select('id')
  record(
    'customer_a_cannot_update_customer_b_order',
    !foreignOrderUpdate.error && (foreignOrderUpdate.data?.length ?? 0) === 0,
    foreignOrderUpdate.error?.message
  )

  const foreignInsertAttempt = await customerAClient
    .from('orders')
    .insert({
      customer_id: customerBId,
      delivery_date: addDays(today, 31),
      status: 'draft',
    })
    .select('id')
  record(
    'customer_a_cannot_insert_for_customer_b',
    Boolean(foreignInsertAttempt.error),
    foreignInsertAttempt.error?.message
  )

  const customerBReadsOwn = await customerBClient
    .from('orders')
    .select('id')
    .eq('id', orderB.id)
  record(
    'customer_b_reads_own_order',
    !customerBReadsOwn.error && (customerBReadsOwn.data?.length ?? 0) === 1,
    customerBReadsOwn.error?.message
  )

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
