import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

interface DataFileState {
  path: string | null
  exists: boolean
  rows: unknown[]
}

function loadLocalEnvFiles() {
  if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env')
  }

  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local')
  }
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

function resolveFilePath(explicitPath: string | undefined, inputDir: string | undefined, fileName: string): string | null {
  if (explicitPath) return explicitPath
  if (inputDir) return path.join(inputDir, fileName)
  return null
}

function readJsonArrayFile(filePath: string | null): DataFileState {
  if (!filePath) {
    return { path: null, exists: false, rows: [] }
  }
  if (!fs.existsSync(filePath)) {
    return { path: filePath, exists: false, rows: [] }
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array in ${filePath}`)
  }

  return {
    path: filePath,
    exists: true,
    rows: parsed,
  }
}

async function main() {
  loadLocalEnvFiles()

  const dbUrl = resolveDbUrl()
  if (!dbUrl) {
    throw new Error(
      'Missing DB URL. Set DATABASE_URL or POSTGRES_URL_NON_POOLING or POSTGRES_URL.'
    )
  }

  const inputDir = process.env.ST6_IMPORT_INPUT_DIR
    ? path.resolve(process.cwd(), process.env.ST6_IMPORT_INPUT_DIR)
    : undefined

  const customersState = readJsonArrayFile(resolveFilePath(process.env.ST6_CUSTOMERS_FILE, inputDir, 'customers.json'))
  const overridesState = readJsonArrayFile(
    resolveFilePath(process.env.ST6_CUSTOMER_OVERRIDES_FILE, inputDir, 'customer-product-overrides.json')
  )
  const palletDealsState = readJsonArrayFile(
    resolveFilePath(process.env.ST6_PALLET_DEALS_FILE, inputDir, 'pallet-deals.json')
  )

  const expectedPalletItems = palletDealsState.rows.reduce<number>((count, row) => {
    if (!row || typeof row !== 'object') return count
    const record = row as { items?: unknown[] }
    return count + (Array.isArray(record.items) ? record.items.length : 0)
  }, 0)

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const result = await client.query<{
      profiles_count: string
      customer_profiles_count: string
      customer_profiles_with_token_count: string
      customer_profiles_with_auth_count: string
      salesman_profiles_count: string
      brands_count: string
      products_count: string
      customer_products_count: string
      pallet_deals_count: string
      pallet_deal_items_count: string
    }>(`
      select
        (select count(*)::text from public.profiles) as profiles_count,
        (select count(*)::text from public.profiles where role = 'customer') as customer_profiles_count,
        (select count(*)::text from public.profiles where role = 'customer' and access_token is not null) as customer_profiles_with_token_count,
        (select count(*)::text from public.profiles where role = 'customer' and auth_user_id is not null) as customer_profiles_with_auth_count,
        (select count(*)::text from public.profiles where role = 'salesman') as salesman_profiles_count,
        (select count(*)::text from public.brands) as brands_count,
        (select count(*)::text from public.products) as products_count,
        (select count(*)::text from public.customer_products) as customer_products_count,
        (select count(*)::text from public.pallet_deals) as pallet_deals_count,
        (select count(*)::text from public.pallet_deal_items) as pallet_deal_items_count
    `)

    const counts = result.rows[0] ?? {
      profiles_count: '0',
      customer_profiles_count: '0',
      customer_profiles_with_token_count: '0',
      customer_profiles_with_auth_count: '0',
      salesman_profiles_count: '0',
      brands_count: '0',
      products_count: '0',
      customer_products_count: '0',
      pallet_deals_count: '0',
      pallet_deal_items_count: '0',
    }

    const profilesCount = Number.parseInt(counts.profiles_count, 10)
    const customerProfilesCount = Number.parseInt(counts.customer_profiles_count, 10)
    const customerProfilesWithTokenCount = Number.parseInt(counts.customer_profiles_with_token_count, 10)
    const customerProfilesWithAuthCount = Number.parseInt(counts.customer_profiles_with_auth_count, 10)
    const salesmanProfilesCount = Number.parseInt(counts.salesman_profiles_count, 10)
    const brandsCount = Number.parseInt(counts.brands_count, 10)
    const productsCount = Number.parseInt(counts.products_count, 10)
    const customerProductsCount = Number.parseInt(counts.customer_products_count, 10)
    const palletDealsCount = Number.parseInt(counts.pallet_deals_count, 10)
    const palletDealItemsCount = Number.parseInt(counts.pallet_deal_items_count, 10)

    if (!Number.isFinite(profilesCount) || profilesCount < 4) {
      throw new Error(`Smoke check failed: expected provisioned profiles, found ${counts.profiles_count}.`)
    }

    if (!Number.isFinite(salesmanProfilesCount) || salesmanProfilesCount < 2) {
      throw new Error(`Smoke check failed: expected provisioned salesmen, found ${counts.salesman_profiles_count}.`)
    }

    if (!Number.isFinite(customerProfilesCount) || customerProfilesCount < 2) {
      throw new Error(`Smoke check failed: expected provisioned customers, found ${counts.customer_profiles_count}.`)
    }

    if (customerProfilesWithTokenCount < customerProfilesCount) {
      throw new Error(
        `Smoke check failed: expected every customer to have a portal token, found ${counts.customer_profiles_with_token_count} of ${counts.customer_profiles_count}.`
      )
    }

    if (!Number.isFinite(brandsCount) || brandsCount < 1) {
      throw new Error(`Smoke check failed: expected imported brands, found ${counts.brands_count}.`)
    }

    if (!Number.isFinite(productsCount) || productsCount < 1) {
      throw new Error(`Smoke check failed: expected imported products, found ${counts.products_count}.`)
    }

    if (customersState.exists && customerProfilesCount < customersState.rows.length) {
      throw new Error(
        `Smoke check failed: expected at least ${customersState.rows.length} imported customers, found ${counts.customer_profiles_count}.`
      )
    }

    const customersWithEmail = customersState.rows.reduce<number>((count, row) => {
      if (!row || typeof row !== 'object') return count
      const record = row as { email?: unknown }
      return typeof record.email === 'string' && record.email.trim() ? count + 1 : count
    }, 0)

    if (customersWithEmail > 0 && customerProfilesWithAuthCount < customersWithEmail) {
      throw new Error(
        `Smoke check failed: expected at least ${customersWithEmail} customer auth links, found ${counts.customer_profiles_with_auth_count}.`
      )
    }

    if (overridesState.exists && customerProductsCount < overridesState.rows.length) {
      throw new Error(
        `Smoke check failed: expected at least ${overridesState.rows.length} customer overrides, found ${counts.customer_products_count}.`
      )
    }

    if (palletDealsState.exists && palletDealsCount < palletDealsState.rows.length) {
      throw new Error(
        `Smoke check failed: expected at least ${palletDealsState.rows.length} pallet deals, found ${counts.pallet_deals_count}.`
      )
    }

    if (palletDealsState.exists && palletDealItemsCount < expectedPalletItems) {
      throw new Error(
        `Smoke check failed: expected at least ${expectedPalletItems} pallet deal items, found ${counts.pallet_deal_items_count}.`
      )
    }

    console.log(
      JSON.stringify(
        {
          counts,
          external_inputs: {
            customers: { path: customersState.path, exists: customersState.exists, rows: customersState.rows.length },
            customerOverrides: { path: overridesState.path, exists: overridesState.exists, rows: overridesState.rows.length },
            palletDeals: { path: palletDealsState.path, exists: palletDealsState.exists, rows: palletDealsState.rows.length },
          },
        },
        null,
        2
      )
    )
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
