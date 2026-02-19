import { readFileSync } from 'node:fs'
import { Client } from 'pg'

interface ProductRow {
  id: string
  brand: string | null
  title: string
  pack_details: string | null
  pack_count: number | null
  size_value: number | null
  size_uom: string | null
}

const SUPPORTED_UOM = new Set(['OZ', 'ML', 'LITER', 'LITERS', 'GALLON', 'GALLONS', 'CT', 'ROLL', 'ROLLS'])

function normalizePackUom(value: string): string {
  return value.trim().toUpperCase()
}

function formatSizeValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value)
}

function formatStructuredSize(sizeValue: number, sizeUom: string): string {
  return `${formatSizeValue(sizeValue)} ${normalizePackUom(sizeUom)}`
}

function getAcceptedSizeModifier(value: string | null | undefined): 'CANS' | 'GLASS' | null {
  const src = (value ?? '').toUpperCase()
  if (!src) return null
  if (/\bGLASS\b/.test(src)) return 'GLASS'
  if (/\bCANS?\b/.test(src)) return 'CANS'
  return null
}

function parseSizeFromPackDetails(packDetails: string): { sizeValue: number; sizeUom: string } | null {
  const src = packDetails.trim().toUpperCase()
  if (!src) return null

  const match = src.match(
    /^\s*\d+\s*\/\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\.|-|\s)?\s*(OZ|ML|LITER|LITERS|GALLON|GALLONS|CT|ROLLS?|ROLL)\b/i
  )
  if (!match) return null

  const sizeValue = Number(match[1])
  const sizeUom = normalizePackUom(match[2]).replace(/\.$/, '')
  if (!Number.isFinite(sizeValue) || sizeValue <= 0 || !SUPPORTED_UOM.has(sizeUom)) return null

  return { sizeValue, sizeUom }
}

function getProductSizeLabel(product: {
  title?: string | null
  pack_details?: string | null
  size_value?: number | null
  size_uom?: string | null
}): string | null {
  const modifier = getAcceptedSizeModifier(product.pack_details) ?? getAcceptedSizeModifier(product.title)

  if (
    typeof product.size_value === 'number' &&
    typeof product.size_uom === 'string' &&
    product.size_uom.trim().length > 0
  ) {
    const base = formatStructuredSize(product.size_value, product.size_uom)
    return modifier ? `${base} ${modifier}` : base
  }

  const fallback = product.pack_details?.trim()
  if (!fallback) return null
  const parsed = parseSizeFromPackDetails(fallback)
  if (!parsed) return null
  const base = formatStructuredSize(parsed.sizeValue, parsed.sizeUom)
  return modifier ? `${base} ${modifier}` : base
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

async function main() {
  const dbUrl = resolveDbUrl()
  if (!dbUrl) {
    throw new Error('Missing DB URL. Set SUPABASE_DB_URL (or configure .claude/settings.local.json).')
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
      order by b.name asc nulls last, p.title asc
    `)

    const rows = rowsResult.rows
    const bySize = new Map<string, { count: number; examples: ProductRow[] }>()
    let cansCount = 0
    let glassCount = 0

    for (const row of rows) {
      const sizeLabel = getProductSizeLabel({
        title: row.title,
        pack_details: row.pack_details,
        size_value: row.size_value,
        size_uom: row.size_uom,
      }) ?? 'Other'

      if (sizeLabel.endsWith(' CANS')) cansCount += 1
      if (sizeLabel.endsWith(' GLASS')) glassCount += 1

      const existing = bySize.get(sizeLabel)
      if (!existing) {
        bySize.set(sizeLabel, { count: 1, examples: [row] })
        continue
      }

      existing.count += 1
      if (existing.examples.length < 3) {
        existing.examples.push(row)
      }
    }

    const sorted = Array.from(bySize.entries())
      .map(([size, value]) => ({ size, count: value.count, examples: value.examples }))
      .sort((a, b) => b.count - a.count || a.size.localeCompare(b.size))

    const other = sorted.find((entry) => entry.size === 'Other')
    console.log(`Active products: ${rows.length}`)
    console.log(`Unique size groups: ${sorted.length}`)
    console.log(`Products in "Other": ${other?.count ?? 0}`)
    console.log(`Products with accepted modifiers: CANS=${cansCount}, GLASS=${glassCount}`)
    console.log('')
    console.log('Top size groups:')

    for (const entry of sorted.slice(0, 20)) {
      console.log(`- ${entry.size}: ${entry.count}`)
    }

    console.log('')
    console.log('Sample rows per top groups:')
    for (const entry of sorted.slice(0, 10)) {
      for (const row of entry.examples) {
        console.log(
          `- [${entry.size}] [${row.brand ?? 'No brand'}] ${row.title} | pack=${row.pack_details ?? 'NULL'}`
        )
      }
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Size-group preview failed: ${message}`)
  process.exit(1)
})
