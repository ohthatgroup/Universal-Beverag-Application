import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

type MissingProductRow = {
  product_id: string
  brand_name: string
  title: string
  pack_details: string
  pack_count: number | null
  size_value: string | null
  size_uom: string | null
  product_family: string
  browse_model: string
  subline: string
  pack_key: string
  water_type: string
  price_point: string
  suggested_search_query: string
}

const HEADERS: Array<keyof MissingProductRow> = [
  'product_id',
  'brand_name',
  'title',
  'pack_details',
  'pack_count',
  'size_value',
  'size_uom',
  'product_family',
  'browse_model',
  'subline',
  'pack_key',
  'water_type',
  'price_point',
  'suggested_search_query',
]

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
    ''
  ).trim()
}

function parseArgs(argv: string[]) {
  const parsed: { brand?: string; out?: string; all?: boolean } = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--brand') {
      if (!next) throw new Error('Missing value for --brand')
      parsed.brand = next
      index += 1
      continue
    }

    if (arg === '--out') {
      if (!next) throw new Error('Missing value for --out')
      parsed.out = next
      index += 1
      continue
    }

    if (arg === '--all') {
      parsed.all = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return parsed
}

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function writeCsv(filePath: string, rows: MissingProductRow[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const lines = [
    HEADERS.join(','),
    ...rows.map((row) => HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ]
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`)
}

function slugifyBrand(brand: string) {
  return brand
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  loadLocalEnvFiles()

  const args = parseArgs(process.argv.slice(2))
  const dbUrl = resolveDbUrl()
  if (!dbUrl) {
    throw new Error('Missing DB URL. Set DATABASE_URL or POSTGRES_URL_NON_POOLING or POSTGRES_URL.')
  }

  const outputPath =
    args.out ??
    (args.brand
      ? path.join(
          process.cwd(),
          'output',
          'product-image-search',
          slugifyBrand(args.brand),
          `missing-${slugifyBrand(args.brand)}-products.csv`
        )
      : args.all
        ? path.join(process.cwd(), 'output', 'product-image-search', 'all-products.csv')
        : path.join(process.cwd(), 'output', 'product-image-search', 'products-without-images.csv'))

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const params = args.brand ? [args.brand] : []
    const brandClause = args.brand ? 'and b.name = $1' : ''
    const result = await client.query<MissingProductRow>(
      `
        select
          p.id::text as product_id,
          b.name as brand_name,
          p.title,
          p.pack_details,
          p.pack_count,
          p.size_value::text as size_value,
          p.size_uom,
          coalesce(p.product_family, '') as product_family,
          coalesce(p.browse_model, '') as browse_model,
          coalesce(p.subline, '') as subline,
          coalesce(p.pack_key, '') as pack_key,
          coalesce(p.water_type, '') as water_type,
          coalesce(p.price_point, '') as price_point,
          trim(concat_ws(' ', b.name, p.title, p.pack_details)) as suggested_search_query
        from public.products p
        join public.brands b on b.id = p.brand_id
        where p.customer_id is null
          and p.is_discontinued = false
          ${args.all ? '' : "and nullif(trim(coalesce(p.image_url, '')), '') is null"}
          ${brandClause}
        order by b.name, p.title, p.pack_details, p.id
      `,
      params
    )

    const coverage = await client.query<{
      active_products: string
      with_images: string
      missing_images: string
    }>(`
      select
        count(*)::text as active_products,
        count(*) filter (where nullif(trim(coalesce(image_url, '')), '') is not null)::text as with_images,
        count(*) filter (where nullif(trim(coalesce(image_url, '')), '') is null)::text as missing_images
      from public.products
      where customer_id is null
        and is_discontinued = false
    `)

    writeCsv(outputPath, result.rows)

    console.log(
      JSON.stringify(
        {
          out: outputPath,
          brand: args.brand ?? null,
          rows: result.rowCount,
          coverage: coverage.rows[0],
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
