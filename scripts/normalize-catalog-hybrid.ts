import { readFileSync } from 'node:fs'
import { Client } from 'pg'

interface CliOptions {
  apply: boolean
  dbUrl?: string
}

interface ProductRow {
  id: string
  brand: string | null
  title: string
  pack_details: string | null
  pack_count: number | null
  size_value: number | null
  size_uom: string | null
}

interface ParsedPack {
  packCount: number
  sizeValue: number
  sizeUom: string
  tail: string
}

interface PlannedUpdate {
  id: string
  before: ProductRow
  after: {
    title: string
    pack_details: string | null
    pack_count: number | null
    size_value: number | null
    size_uom: string | null
  }
  reasons: string[]
}

const ALLOWED_UOM = new Set([
  'OZ',
  'ML',
  'LITER',
  'LITERS',
  'GALLON',
  'GALLONS',
  'CT',
  'ROLL',
  'ROLLS',
])

const TAIL_PACKAGING_ONLY = new Set([
  'GLASS',
  'PLASTIC',
  'SPORTS CAP',
  'CLEAR',
  'BOTTLES',
  'BOTTLE',
  'WATER',
  'CANS',
  'CAN',
  'PLASTIC STILL',
  'PLASTIC SPARKLING',
])

function parseArgs(argv: string[]): CliOptions {
  let apply = false
  let dbUrl: string | undefined

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply') {
      apply = true
      continue
    }
    if (arg === '--db-url' && argv[i + 1]) {
      dbUrl = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node --experimental-strip-types scripts/normalize-catalog-hybrid.ts [--apply] [--db-url <url>]')
      process.exit(0)
    }
  }

  return { apply, dbUrl }
}

function normalizeSpaces(value: string | null | undefined): string {
  return (value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeUpper(value: string | null | undefined): string {
  return normalizeSpaces(value).toUpperCase()
}

function formatSizeValue(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function formatStructuredPack(packCount: number, sizeValue: number, sizeUom: string): string {
  return `${packCount}/${formatSizeValue(sizeValue)} ${sizeUom}`
}

function parsePack(value: string | null): ParsedPack | null {
  const src = normalizeUpper(value)
  if (!src) return null

  // Handles formats like:
  // - 24/12 OZ
  // - 24/17.6.OZ COCONUT JUICE
  // - 6/2-LITER
  // - 15/1LITER
  const match = src.match(
    /^\s*(\d+)\s*\/\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\.|-|\s)?\s*(OZ|ML|LITER|LITERS|GALLON|GALLONS|CT|ROLLS?|ROLL)\b(.*)$/i
  )
  if (!match) return null

  const packCount = Number(match[1])
  const sizeValue = Number(match[2])
  const rawUom = normalizeUpper(match[3]).replace(/\.$/, '')
  const sizeUom = rawUom === 'ROLLS' ? 'ROLLS' : rawUom
  const tail = normalizeSpaces(match[4])

  if (!Number.isInteger(packCount) || packCount <= 0) return null
  if (!Number.isFinite(sizeValue) || sizeValue <= 0) return null
  if (!ALLOWED_UOM.has(sizeUom)) return null

  return { packCount, sizeValue, sizeUom, tail }
}

function shouldSplitTitleFromPack(tail: string): boolean {
  if (!tail) return false
  return !TAIL_PACKAGING_ONLY.has(normalizeUpper(tail))
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

function resolveDbUrl(explicit?: string): string | undefined {
  return (
    explicit ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    dbUrlFromClaudeSettings()
  )
}

function planRowUpdate(row: ProductRow): PlannedUpdate | null {
  const parsed = parsePack(row.pack_details)
  if (!parsed) return null

  let nextTitle = normalizeSpaces(row.title)
  let nextPackDetails = row.pack_details ? normalizeSpaces(row.pack_details) : null
  let nextPackCount = row.pack_count
  let nextSizeValue = row.size_value
  let nextSizeUom = row.size_uom ? normalizeUpper(row.size_uom) : null
  const reasons: string[] = []

  const needsStructuredBackfill =
    nextPackCount === null || nextSizeValue === null || nextSizeUom === null
  if (needsStructuredBackfill) {
    nextPackCount = parsed.packCount
    nextSizeValue = Number(parsed.sizeValue.toFixed(3))
    nextSizeUom = parsed.sizeUom
    reasons.push('backfill_structured_pack')
  }

  const titleEqPack = normalizeUpper(row.title) === normalizeUpper(row.pack_details)
  if (titleEqPack && parsed.tail && shouldSplitTitleFromPack(parsed.tail)) {
    nextTitle = parsed.tail
    nextPackDetails = formatStructuredPack(parsed.packCount, parsed.sizeValue, parsed.sizeUom)
    reasons.push('split_title_from_pack_pattern')
  }

  const brandUpper = normalizeUpper(row.brand)
  const titleUpper = normalizeUpper(row.title)
  if (titleUpper === 'FOCO' && brandUpper.includes('FOCO') && parsed.tail === 'COCONUT JUICE') {
    nextTitle = 'COCONUT JUICE'
    nextPackDetails = formatStructuredPack(parsed.packCount, parsed.sizeValue, parsed.sizeUom)
    reasons.push('retitle_foco_coconut_juice')
  }

  if (
    titleUpper === 'VOSS' &&
    brandUpper.includes('VOSS') &&
    (parsed.tail === 'SPARKLING' || parsed.tail === 'STILL')
  ) {
    nextTitle = parsed.tail
    nextPackDetails = formatStructuredPack(parsed.packCount, parsed.sizeValue, parsed.sizeUom)
    reasons.push('retitle_voss_variant')
  }

  if (reasons.length === 0) {
    return null
  }

  const changed =
    nextTitle !== normalizeSpaces(row.title) ||
    normalizeSpaces(nextPackDetails) !== normalizeSpaces(row.pack_details) ||
    nextPackCount !== row.pack_count ||
    Number(nextSizeValue ?? 0) !== Number(row.size_value ?? 0) ||
    normalizeUpper(nextSizeUom) !== normalizeUpper(row.size_uom)

  if (!changed) {
    return null
  }

  return {
    id: row.id,
    before: row,
    after: {
      title: nextTitle,
      pack_details: nextPackDetails,
      pack_count: nextPackCount,
      size_value: nextSizeValue,
      size_uom: nextSizeUom,
    },
    reasons,
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const dbUrl = resolveDbUrl(options.dbUrl)
  if (!dbUrl) {
    throw new Error('Missing DB URL. Set SUPABASE_DB_URL (or pass --db-url).')
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const rowsResult = await client.query<ProductRow>(`
      select
        p.id,
        b.name as brand,
        p.title,
        p.pack_details,
        p.pack_count,
        p.size_value,
        p.size_uom
      from products p
      left join brands b on b.id = p.brand_id
      where not p.is_discontinued
      order by b.name asc nulls last, p.sort_order asc, p.title asc
    `)

    const planned = rowsResult.rows
      .map((row) => planRowUpdate(row))
      .filter((row): row is PlannedUpdate => Boolean(row))

    const reasonCounts = new Map<string, number>()
    for (const update of planned) {
      for (const reason of update.reasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
      }
    }

    console.log(`Planned updates: ${planned.length}`)
    if (reasonCounts.size > 0) {
      console.log('By reason:')
      for (const [reason, count] of reasonCounts.entries()) {
        console.log(`- ${reason}: ${count}`)
      }
    }

    if (planned.length > 0) {
      console.log('Update sample:')
      for (const update of planned.slice(0, 30)) {
        const reasonText = update.reasons.join(', ')
        console.log(
          `- [${update.before.brand ?? 'No brand'}] "${update.before.title}" -> "${update.after.title}" | ` +
            `pack "${update.before.pack_details ?? 'NULL'}" -> "${update.after.pack_details ?? 'NULL'}" | ${reasonText}`
        )
      }
    }

    if (options.apply && planned.length > 0) {
      await client.query('begin')
      for (const update of planned) {
        await client.query(
          `update products
           set
             title = $1,
             pack_details = $2,
             pack_count = $3,
             size_value = $4,
             size_uom = $5
           where id = $6`,
          [
            update.after.title,
            update.after.pack_details,
            update.after.pack_count,
            update.after.size_value,
            update.after.size_uom,
            update.id,
          ]
        )
      }
      await client.query('commit')
      console.log(`Applied updates: ${planned.length}`)
    } else if (!options.apply) {
      console.log('Dry run only. Use --apply to persist updates.')
    }

    const postStats = await client.query(`
      select
        count(*)::int as total_products,
        count(*) filter (where pack_count is not null and size_value is not null and size_uom is not null)::int as structured_products,
        count(*) filter (where pack_count is null and size_value is null and size_uom is null)::int as unstructured_products,
        count(*) filter (where upper(title) = upper(coalesce(pack_details, '')) and pack_details is not null)::int as title_equals_pack
      from products
      where not is_discontinued
    `)
    console.log('Post stats:', postStats.rows[0])

    const manualReview = await client.query(`
      select
        b.name as brand,
        p.title,
        p.pack_details,
        p.pack_count,
        p.size_value,
        p.size_uom,
        p.price
      from products p
      left join brands b on b.id = p.brand_id
      where not p.is_discontinued
        and (
          (p.pack_count is null and p.size_value is null and p.size_uom is null)
          or upper(p.title) = upper(coalesce(p.pack_details, ''))
          or p.title ~* '^\\s*\\d+\\s*/\\s*[0-9.]'
          or p.pack_details ~* '^\\s*[0-9]+\\s*/\\s*[0-9.]+[^A-Z0-9]*(OZ|ML|LITER|LITERS|GALLON|GALLONS|CT|ROLL|ROLLS)\\b\\s+'
        )
      order by b.name asc nulls last, p.title asc
      limit 120
    `)
    console.log(`Manual review sample (${manualReview.rows.length} rows):`)
    for (const row of manualReview.rows) {
      console.log(
        `- [${row.brand ?? 'No brand'}] ${row.title} | pack=${row.pack_details ?? 'NULL'} | ` +
          `structured=${row.pack_count ?? 'NULL'}/${row.size_value ?? 'NULL'} ${row.size_uom ?? ''} | price=${row.price}`
      )
    }
  } catch (error) {
    try {
      await client.query('rollback')
    } catch {
      // noop
    }
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Normalization failed: ${message}`)
  process.exit(1)
})
