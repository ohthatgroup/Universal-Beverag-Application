import { readFileSync } from 'node:fs'
import { Client } from 'pg'

interface CliOptions {
  apply: boolean
}

interface BrandRow {
  id: string
  name: string
  sort_order: number
}

interface BrandGroup {
  canonical: string
  variants: string[]
}

const GROUPS: BrandGroup[] = [
  {
    canonical: 'Pepsi',
    variants: ['Pepsi 12/1.25', 'Pepsi 24/12 O', 'Pepsi 24/20 O', 'Pepsi 6/2-Lit'],
  },
  {
    canonical: 'Coca-Cola',
    variants: [
      'Coke 12/1 Li',
      'Coke 12/1.25',
      'Coke 24/12 O',
      'Coke 24/20 O',
      'Coke 8/2-Lit',
      'Coke Flavored Mini Cans 7.5 Oz',
      'Coke Flavored Slim Cans 12 Oz',
    ],
  },
  {
    canonical: 'Canada Dry',
    variants: ['Canada Dry 12/1 Li', 'Canada Dry 24/12 O', 'Canada Dry 24/20 O', 'Canada Dry 6/2-Lit'],
  },
  {
    canonical: 'Gatorade',
    variants: ['Gatorade 15/28 O', 'Gatorade 24/20 O'],
  },
  {
    canonical: 'Powerade',
    variants: ['Powerade 15/28 O'],
  },
]

function parseArgs(argv: string[]): CliOptions {
  let apply = false
  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node --experimental-strip-types scripts/normalize-brand-groups.ts [--apply]')
      process.exit(0)
    }
  }
  return { apply }
}

function dbUrlFromClaudeSettings(): string | undefined {
  try {
    const raw = JSON.parse(readFileSync('.claude/settings.local.json', 'utf8')) as {
      permissions?: { allow?: string[] }
    }
    const allow = raw.permissions?.allow ?? []
    const hit = allow.find((entry) => /SUPABASE_DB_URL="/.test(entry))
    if (!hit) return undefined
    const match = hit.match(/SUPABASE_DB_URL="([^"]+)"/)
    return match?.[1]
  } catch {
    return undefined
  }
}

function resolveDbUrl(): string | undefined {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    dbUrlFromClaudeSettings()
  )
}

async function ensureCanonicalBrand(
  client: Client,
  canonicalName: string,
  existing: BrandRow[]
): Promise<BrandRow> {
  const found = existing.find((row) => row.name === canonicalName)
  if (found) return found

  const maxSort = existing.reduce((max, row) => Math.max(max, row.sort_order), 0)
  const inserted = await client.query<BrandRow>(
    'insert into brands (name, sort_order) values ($1, $2) returning id, name, sort_order',
    [canonicalName, maxSort + 1]
  )
  return inserted.rows[0]
}

async function countProductsForBrand(client: Client, brandId: string): Promise<number> {
  const result = await client.query<{ count: string }>(
    'select count(*)::text as count from products where brand_id = $1',
    [brandId]
  )
  return Number(result.rows[0]?.count ?? 0)
}

async function run() {
  const options = parseArgs(process.argv.slice(2))
  const dbUrl = resolveDbUrl()
  if (!dbUrl) {
    throw new Error('Missing DB URL. Set SUPABASE_DB_URL (or configure .claude/settings.local.json).')
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  let createdCanonical = 0
  let movedProducts = 0
  let deletedVariantBrands = 0

  try {
    if (options.apply) {
      await client.query('begin')
    }

    for (const group of GROUPS) {
      const names = [group.canonical, ...group.variants]
      const brandsResult = await client.query<BrandRow>(
        'select id, name, sort_order from brands where name = any($1::text[]) order by name',
        [names]
      )
      const existing = brandsResult.rows

      let canonical = existing.find((row) => row.name === group.canonical)
      if (!canonical && options.apply) {
        canonical = await ensureCanonicalBrand(client, group.canonical, existing)
        createdCanonical += 1
      }

      console.log(`Group: ${group.canonical}`)
      if (!canonical) {
        console.log(`- canonical missing (dry-run): ${group.canonical}`)
      } else {
        console.log(`- canonical id: ${canonical.id}`)
      }

      for (const variantName of group.variants) {
        const variant = existing.find((row) => row.name === variantName)
        if (!variant) {
          console.log(`- variant not found: ${variantName}`)
          continue
        }

        const variantCount = await countProductsForBrand(client, variant.id)
        console.log(`- variant: ${variant.name} | products=${variantCount}`)

        if (!options.apply || !canonical || canonical.id === variant.id) {
          continue
        }

        if (variantCount > 0) {
          const moved = await client.query(
            'update products set brand_id = $1 where brand_id = $2',
            [canonical.id, variant.id]
          )
          movedProducts += moved.rowCount ?? 0
          console.log(`  moved products: ${moved.rowCount ?? 0}`)
        }

        const left = await countProductsForBrand(client, variant.id)
        if (left === 0) {
          const deleted = await client.query('delete from brands where id = $1', [variant.id])
          if ((deleted.rowCount ?? 0) > 0) {
            deletedVariantBrands += 1
            console.log('  deleted empty variant brand')
          }
        }
      }
    }

    if (options.apply) {
      await client.query('commit')
    }

    console.log('')
    console.log(`Created canonical brands: ${createdCanonical}`)
    console.log(`Moved products: ${movedProducts}`)
    console.log(`Deleted variant brands: ${deletedVariantBrands}`)
    if (!options.apply) {
      console.log('Dry run only. Re-run with --apply to persist.')
    }

    const postCheck = await client.query(`
      select b.name, count(p.id)::int as product_count
      from brands b
      left join products p on p.brand_id = b.id and not p.is_discontinued
      where b.name = 'Coca-Cola'
         or b.name similar to '(Pepsi%|Coke%|Canada Dry%|Gatorade%|Powerade%)'
      group by b.name
      order by b.name
    `)

    console.log('')
    console.log('Remaining family brands:')
    for (const row of postCheck.rows) {
      console.log(`- ${row.name}: ${row.product_count}`)
    }
  } catch (error) {
    if (options.apply) {
      try {
        await client.query('rollback')
      } catch {
        // noop
      }
    }
    throw error
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Brand normalization failed: ${message}`)
  process.exit(1)
})
