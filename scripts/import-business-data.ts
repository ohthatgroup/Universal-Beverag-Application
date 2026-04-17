import fs from 'node:fs'
import path from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Client } from 'pg'

interface ImportOptions {
  apply: boolean
  catalogOnly: boolean
  catalogFile?: string
  inputDir?: string
  customersFile?: string
  overridesFile?: string
  palletDealsFile?: string
  reportFile?: string
}

interface CustomerImportRow {
  businessName: string
  email?: string | null
  contactName?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  showPrices?: boolean | null
  customPricing?: boolean | null
  defaultGroup?: 'brand' | 'size' | null
}

interface CustomerOverrideImportRow {
  customerBusinessName?: string | null
  customerEmail?: string | null
  brandName: string
  productTitle: string
  packDetails?: string | null
  excluded?: boolean | null
  customPrice?: number | null
}

interface PalletDealItemImportRow {
  brandName: string
  productTitle: string
  packDetails?: string | null
  quantity: number
}

interface PalletDealImportRow {
  title: string
  palletType: 'single' | 'mixed'
  price: number
  savingsText?: string | null
  description?: string | null
  isActive?: boolean | null
  sortOrder?: number | null
  items: PalletDealItemImportRow[]
}

interface DataFileState<T> {
  path: string | null
  exists: boolean
  rows: T[]
}

interface ImportSectionReport {
  sourcePath: string | null
  sourceRows: number
  created: number
  updated: number
  skipped: number
  unresolved: number
}

interface CatalogImportReport {
  mode: 'dry-run' | 'apply'
  workbookPath: string
  parsedPricedRows: number
  uniqueProducts: number
  distinctBrands: number
  skippedRows: number
  duplicateWorkbookRows: number
  brandsToCreate: number
  createdBrands: number
  productsToInsert: number
  productsToUpdate: number
  productsUnchanged: number
  unresolvedBrandProducts: number
}

interface St6ImportReport {
  mode: 'dry-run' | 'apply'
  catalog: CatalogImportReport
  customers: ImportSectionReport
  customerOverrides: ImportSectionReport
  palletDeals: ImportSectionReport
  notes: string[]
}

async function runCatalogImportStep(argv: string[]) {
  const currentFile = fileURLToPath(import.meta.url)
  const catalogModuleUrl = pathToFileURL(path.join(path.dirname(currentFile), 'import-catalog-xlsx.ts')).href
  const catalogModule = (await import(catalogModuleUrl)) as {
    runCatalogImport: (args: string[]) => Promise<CatalogImportReport>
  }

  return catalogModule.runCatalogImport(argv)
}

function loadLocalEnvFiles() {
  if (fs.existsSync('.env')) {
    process.loadEnvFile?.('.env')
  }

  if (fs.existsSync('.env.local')) {
    process.loadEnvFile?.('.env.local')
  }
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

function resolveDbUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  ).trim()
}

function printHelp() {
  console.log(
    [
      'Usage: node --experimental-strip-types scripts/import-business-data.ts [options]',
      '',
      'Options:',
      '  --apply                 Persist import results. Without this flag, dry-run only.',
      '  --catalog-only          Skip optional non-catalog data files and import the workbook only.',
      '  --catalog-file <path>   Override the catalog workbook path.',
      '  --input-dir <path>      Directory containing optional external JSON files.',
      '  --customers-file <path> Override customer profile/settings JSON file.',
      '  --overrides-file <path> Override customer product overrides JSON file.',
      '  --pallet-deals-file <path> Override pallet deals/items JSON file.',
      '  --report-file <path>    Write the final reconciliation report JSON to this path.',
      '',
      'Default external file names under --input-dir:',
      '  customers.json',
      '  customer-product-overrides.json',
      '  pallet-deals.json',
    ].join('\n')
  )
}

function parseArgs(argv: string[]): ImportOptions {
  const options: ImportOptions = {
    apply: false,
    catalogOnly: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--apply') {
      options.apply = true
      continue
    }
    if (arg === '--catalog-only') {
      options.catalogOnly = true
      continue
    }
    if ((arg === '--catalog-file' || arg === '--input-dir' || arg === '--customers-file' || arg === '--overrides-file' || arg === '--pallet-deals-file' || arg === '--report-file') && argv[index + 1]) {
      const next = path.resolve(process.cwd(), argv[index + 1])
      if (arg === '--catalog-file') options.catalogFile = next
      if (arg === '--input-dir') options.inputDir = next
      if (arg === '--customers-file') options.customersFile = next
      if (arg === '--overrides-file') options.overridesFile = next
      if (arg === '--pallet-deals-file') options.palletDealsFile = next
      if (arg === '--report-file') options.reportFile = next
      index += 1
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return options
}

function resolveFilePath(explicitPath: string | undefined, inputDir: string | undefined, fileName: string): string | null {
  if (explicitPath) return explicitPath
  if (inputDir) return path.join(inputDir, fileName)
  return null
}

function readJsonArrayFile<T>(filePath: string | null): DataFileState<T> {
  if (!filePath) {
    return { path: null, exists: false, rows: [] }
  }
  if (!fs.existsSync(filePath)) {
    return { path: filePath, exists: false, rows: [] }
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array in ${filePath}`)
  }

  return {
    path: filePath,
    exists: true,
    rows: parsed as T[],
  }
}

function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.trim()
  return cleaned ? cleaned : null
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function roundCurrency(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  return Math.round(value * 100) / 100
}

type CustomerLookup = {
  id: string
  business_name: string | null
  email: string | null
}

type ProductLookup = {
  id: string
  brand_name: string
  title: string
  pack_details: string | null
}

async function importCustomers(
  client: Client,
  state: DataFileState<CustomerImportRow>,
  apply: boolean
): Promise<ImportSectionReport> {
  const report: ImportSectionReport = {
    sourcePath: state.path,
    sourceRows: state.rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    unresolved: 0,
  }

  if (!state.exists || state.rows.length === 0) {
    return report
  }

  const existing = await client.query<CustomerLookup>(
    `select id, business_name, email
     from profiles
     where role = 'customer'`
  )
  const byBusiness = new Map(existing.rows.map((row) => [normalizeKey(row.business_name), row]))
  const byEmail = new Map(existing.rows.filter((row) => row.email).map((row) => [normalizeKey(row.email), row]))

  for (const row of state.rows) {
    const businessName = cleanText(row.businessName)
    if (!businessName) {
      report.skipped += 1
      continue
    }

    const email = cleanText(row.email)?.toLowerCase() ?? null
    const existingProfile =
      (email ? byEmail.get(normalizeKey(email)) : undefined) ?? byBusiness.get(normalizeKey(businessName))

    if (!apply) {
      if (existingProfile) {
        report.updated += 1
      } else {
        report.created += 1
      }
      continue
    }

    const values = {
      business_name: businessName,
      email,
      contact_name: cleanText(row.contactName),
      phone: cleanText(row.phone),
      address: cleanText(row.address),
      city: cleanText(row.city),
      state: cleanText(row.state),
      zip: cleanText(row.zip),
      show_prices: row.showPrices ?? true,
      custom_pricing: row.customPricing ?? false,
      default_group: row.defaultGroup ?? 'brand',
    }

    if (existingProfile) {
      await client.query(
        `update profiles
         set business_name = $2,
             email = $3,
             contact_name = $4,
             phone = $5,
             address = $6,
             city = $7,
             state = $8,
             zip = $9,
             show_prices = $10,
             custom_pricing = $11,
             default_group = $12,
             access_token = coalesce(access_token, $13),
             updated_at = now()
         where id = $1`,
        [
          existingProfile.id,
          values.business_name,
          values.email,
          values.contact_name,
          values.phone,
          values.address,
          values.city,
          values.state,
          values.zip,
          values.show_prices,
          values.custom_pricing,
          values.default_group,
          randomBytes(16).toString('hex'),
        ]
      )
      report.updated += 1
      continue
    }

    const inserted = await client.query<CustomerLookup>(
      `insert into profiles (
         id, role, business_name, email, contact_name, phone, address, city, state, zip, show_prices, custom_pricing, default_group, access_token
       ) values (
         $1, 'customer', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
       )
       returning id, business_name, email`,
      [
        randomUUID(),
        values.business_name,
        values.email,
        values.contact_name,
        values.phone,
        values.address,
        values.city,
        values.state,
        values.zip,
        values.show_prices,
        values.custom_pricing,
        values.default_group,
        randomBytes(16).toString('hex'),
      ]
    )

    const created = inserted.rows[0]
    if (created) {
      byBusiness.set(normalizeKey(created.business_name), created)
      if (created.email) {
        byEmail.set(normalizeKey(created.email), created)
      }
    }
    report.created += 1
  }

  return report
}

async function buildCustomerLookupMaps(client: Client) {
  const customers = await client.query<CustomerLookup>(
    `select id, business_name, email
     from profiles
     where role = 'customer'`
  )

  const byBusiness = new Map(customers.rows.map((row) => [normalizeKey(row.business_name), row]))
  const byEmail = new Map(customers.rows.filter((row) => row.email).map((row) => [normalizeKey(row.email), row]))
  return { byBusiness, byEmail }
}

async function buildProductLookupMap(client: Client) {
  const products = await client.query<ProductLookup>(
    `select p.id, b.name as brand_name, p.title, p.pack_details
     from products p
     join brands b on b.id = p.brand_id`
  )
  return new Map(
    products.rows.map((row) => [
      `${normalizeKey(row.brand_name)}|${normalizeKey(row.title)}|${normalizeKey(row.pack_details)}`,
      row,
    ])
  )
}

async function importCustomerOverrides(
  client: Client,
  state: DataFileState<CustomerOverrideImportRow>,
  apply: boolean
): Promise<ImportSectionReport> {
  const report: ImportSectionReport = {
    sourcePath: state.path,
    sourceRows: state.rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    unresolved: 0,
  }

  if (!state.exists || state.rows.length === 0) {
    return report
  }

  const customers = await buildCustomerLookupMaps(client)
  const products = await buildProductLookupMap(client)

  for (const row of state.rows) {
    const customer =
      (row.customerEmail ? customers.byEmail.get(normalizeKey(row.customerEmail)) : undefined) ??
      (row.customerBusinessName ? customers.byBusiness.get(normalizeKey(row.customerBusinessName)) : undefined)
    const product = products.get(
      `${normalizeKey(row.brandName)}|${normalizeKey(row.productTitle)}|${normalizeKey(row.packDetails)}`
    )

    if (!customer || !product) {
      report.unresolved += 1
      continue
    }

    if (!apply) {
      const existing = await client.query<{ customer_id: string }>(
        `select customer_id
         from customer_products
         where customer_id = $1 and product_id = $2`,
        [customer.id, product.id]
      )
      if (existing.rowCount) {
        report.updated += 1
      } else {
        report.created += 1
      }
      continue
    }

    const existing = await client.query<{ customer_id: string }>(
      `select customer_id
       from customer_products
       where customer_id = $1 and product_id = $2`,
      [customer.id, product.id]
    )

    await client.query(
      `insert into customer_products (customer_id, product_id, excluded, custom_price)
       values ($1, $2, $3, $4)
       on conflict (customer_id, product_id)
       do update set excluded = EXCLUDED.excluded, custom_price = EXCLUDED.custom_price`,
      [customer.id, product.id, row.excluded ?? false, roundCurrency(row.customPrice)]
    )

    if (existing.rowCount) {
      report.updated += 1
    } else {
      report.created += 1
    }
  }

  return report
}

async function importPalletDeals(
  client: Client,
  state: DataFileState<PalletDealImportRow>,
  apply: boolean
): Promise<ImportSectionReport> {
  const report: ImportSectionReport = {
    sourcePath: state.path,
    sourceRows: state.rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    unresolved: 0,
  }

  if (!state.exists || state.rows.length === 0) {
    return report
  }

  const products = await buildProductLookupMap(client)
  const existingDeals = await client.query<{ id: string; title: string }>(
    `select id, title from pallet_deals`
  )
  const byTitle = new Map(existingDeals.rows.map((row) => [normalizeKey(row.title), row]))

  for (const deal of state.rows) {
    const title = cleanText(deal.title)
    if (!title) {
      report.skipped += 1
      continue
    }

    const unresolvedItems = deal.items.filter(
      (item) =>
        !products.get(
          `${normalizeKey(item.brandName)}|${normalizeKey(item.productTitle)}|${normalizeKey(item.packDetails)}`
        )
    )
    if (unresolvedItems.length > 0) {
      report.unresolved += unresolvedItems.length
      continue
    }

    const existingDeal = byTitle.get(normalizeKey(title))
    if (!apply) {
      if (existingDeal) {
        report.updated += 1
      } else {
        report.created += 1
      }
      continue
    }

    let palletDealId = existingDeal?.id ?? null
    if (existingDeal) {
      await client.query(
        `update pallet_deals
         set pallet_type = $2,
             price = $3,
             savings_text = $4,
             description = $5,
             is_active = $6,
             sort_order = $7
         where id = $1`,
        [
          existingDeal.id,
          deal.palletType,
          roundCurrency(deal.price),
          cleanText(deal.savingsText),
          cleanText(deal.description),
          deal.isActive ?? true,
          deal.sortOrder ?? 0,
        ]
      )
      report.updated += 1
    } else {
      const inserted = await client.query<{ id: string }>(
        `insert into pallet_deals (
           id, title, pallet_type, price, savings_text, description, is_active, sort_order
         ) values (
           $1, $2, $3, $4, $5, $6, $7, $8
         )
         returning id`,
        [
          randomUUID(),
          title,
          deal.palletType,
          roundCurrency(deal.price),
          cleanText(deal.savingsText),
          cleanText(deal.description),
          deal.isActive ?? true,
          deal.sortOrder ?? 0,
        ]
      )
      palletDealId = inserted.rows[0]?.id ?? null
      if (palletDealId) {
        byTitle.set(normalizeKey(title), { id: palletDealId, title })
      }
      report.created += 1
    }

    if (!palletDealId) {
      report.unresolved += deal.items.length
      continue
    }

    await client.query(`delete from pallet_deal_items where pallet_deal_id = $1`, [palletDealId])
    for (const item of deal.items) {
      const product = products.get(
        `${normalizeKey(item.brandName)}|${normalizeKey(item.productTitle)}|${normalizeKey(item.packDetails)}`
      )
      if (!product) continue
      await client.query(
        `insert into pallet_deal_items (id, pallet_deal_id, product_id, quantity)
         values ($1, $2, $3, $4)`,
        [randomUUID(), palletDealId, product.id, item.quantity]
      )
    }
  }

  return report
}

async function main() {
  loadLocalEnvFiles()

  const options = parseArgs(process.argv.slice(2))
  const inputDir =
    options.inputDir ??
    (process.env.ST6_IMPORT_INPUT_DIR ? path.resolve(process.cwd(), process.env.ST6_IMPORT_INPUT_DIR) : undefined)

  const customersState = options.catalogOnly
    ? { path: null, exists: false, rows: [] as CustomerImportRow[] }
    : readJsonArrayFile<CustomerImportRow>(
        resolveFilePath(options.customersFile, inputDir, 'customers.json')
      )
  const overridesState = options.catalogOnly
    ? { path: null, exists: false, rows: [] as CustomerOverrideImportRow[] }
    : readJsonArrayFile<CustomerOverrideImportRow>(
        resolveFilePath(options.overridesFile, inputDir, 'customer-product-overrides.json')
      )
  const palletDealsState = options.catalogOnly
    ? { path: null, exists: false, rows: [] as PalletDealImportRow[] }
    : readJsonArrayFile<PalletDealImportRow>(
        resolveFilePath(options.palletDealsFile, inputDir, 'pallet-deals.json')
      )

  const notes: string[] = []
  if (!customersState.exists && customersState.path) {
    notes.push(`Customer import skipped: source file not found at ${customersState.path}`)
  }
  if (!overridesState.exists && overridesState.path) {
    notes.push(`Customer override import skipped: source file not found at ${overridesState.path}`)
  }
  if (!palletDealsState.exists && palletDealsState.path) {
    notes.push(`Pallet deal import skipped: source file not found at ${palletDealsState.path}`)
  }

  const catalogArgv: string[] = []
  if (options.apply) catalogArgv.push('--apply')
  if (options.catalogFile) {
    catalogArgv.push('--file', options.catalogFile)
  }

  const catalogReport = await runCatalogImportStep(catalogArgv)

  const report: St6ImportReport = {
    mode: options.apply ? 'apply' : 'dry-run',
    catalog: catalogReport,
    customers: {
      sourcePath: customersState.path,
      sourceRows: customersState.rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      unresolved: 0,
    },
    customerOverrides: {
      sourcePath: overridesState.path,
      sourceRows: overridesState.rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      unresolved: 0,
    },
    palletDeals: {
      sourcePath: palletDealsState.path,
      sourceRows: palletDealsState.rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      unresolved: 0,
    },
    notes,
  }

  const shouldImportAdditional =
    customersState.exists || overridesState.exists || palletDealsState.exists

  if (!shouldImportAdditional) {
    const serialized = JSON.stringify(report, null, 2)
    if (options.reportFile) {
      fs.mkdirSync(path.dirname(options.reportFile), { recursive: true })
      fs.writeFileSync(options.reportFile, `${serialized}\n`)
    }
    console.log(serialized)
    return
  }

  const dbUrl = resolveDbUrl()
  if (!dbUrl) {
    throw new Error('Missing DB URL. Set DATABASE_URL or POSTGRES_URL_NON_POOLING or POSTGRES_URL.')
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    report.customers = await importCustomers(client, customersState, options.apply)
    report.customerOverrides = await importCustomerOverrides(client, overridesState, options.apply)
    report.palletDeals = await importPalletDeals(client, palletDealsState, options.apply)
  } finally {
    await client.end()
  }

  const serialized = JSON.stringify(report, null, 2)
  if (options.reportFile) {
    fs.mkdirSync(path.dirname(options.reportFile), { recursive: true })
    fs.writeFileSync(options.reportFile, `${serialized}\n`)
  }
  console.log(serialized)
}

main().catch((error) => {
  const message = formatError(error)
  console.error(`Business-data import failed: ${message}`)
  process.exit(1)
})
