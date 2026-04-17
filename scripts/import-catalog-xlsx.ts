import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

type Block = 'left' | 'right'

interface CliOptions {
  filePath: string
  apply: boolean
  dbUrl?: string
}

interface RawSheetRow {
  row: number
  cells: Record<string, string>
}

interface BlockEntry {
  row: number
  description: string
  priceRaw: string
}

interface SectionContext {
  brand: string | null
  packDetails: string | null
}

interface ParsedProduct {
  row: number
  block: Block
  sequence: number
  brand: string
  title: string
  packDetails: string | null
  price: number
}

interface SkippedRow {
  row: number
  block: Block
  description: string
  priceRaw: string
  reason: string
}

interface ParsedWorkbook {
  products: ParsedProduct[]
  skipped: SkippedRow[]
}

interface ExistingBrandRow {
  id: string
  name: string
  sort_order: number
}

interface ExistingProductRow {
  id: string
  brand_id: string | null
  title: string
  pack_details: string | null
  price: number
  sort_order: number
  is_discontinued: boolean
}

export interface CatalogImportReport {
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

const HEADER_TOKENS = new Set(['PRODUCT', 'DESCRIPTION', 'CASE', 'COST'])

function loadLocalEnvFiles() {
  if (existsSync('.env')) {
    process.loadEnvFile?.('.env')
  }

  if (existsSync('.env.local')) {
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

const BRANDS_ALIAS: Record<string, string> = {
  COKE: 'Coca-Cola',
  'COCA COLA': 'Coca-Cola',
  PEPSI: 'Pepsi',
  'DR PEPPER': 'Dr Pepper',
  'DR. PEPPER': 'Dr Pepper',
  'CANADA DRY': 'Canada Dry',
  'RED BULL': 'Red Bull',
}

function parseArgs(argv: string[]): CliOptions {
  let filePath =
    'Universal Beverages Price list MAR. 25 25 DRINKS (2).xlsx'
  let apply = false
  let dbUrl: string | undefined

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--file' && argv[i + 1]) {
      filePath = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--db-url' && argv[i + 1]) {
      dbUrl = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--apply') {
      apply = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return {
    filePath: resolve(process.cwd(), filePath),
    apply,
    dbUrl,
  }
}

function printHelp() {
  console.log(
      [
      'Usage: node --experimental-strip-types scripts/import-catalog-xlsx.ts [--file <path>] [--apply] [--db-url <url>]',
      '',
      'Options:',
      '  --file     Path to .xlsx file. Defaults to workbook in repo root.',
      '  --apply    Write brands/products to DB. Without this flag, dry-run only.',
      '  --db-url   Postgres connection string. Fallbacks: env vars, .claude/settings.local.json.',
      '',
      'Environment fallback order:',
      '  DATABASE_URL -> SUPABASE_DB_URL -> POSTGRES_URL_NON_POOLING -> POSTGRES_URL',
    ].join('\n')
  )
}

function normalizeSpaces(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeKey(value: string | null | undefined): string {
  return normalizeSpaces(value ?? '').toUpperCase()
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(Number.parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

interface ZipEntry {
  compressionMethod: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

function locateEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - (0xffff + 22))
  for (let i = buffer.length - 22; i >= minOffset; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      return i
    }
  }
  throw new Error('Invalid xlsx: End of central directory signature not found.')
}

function readZipEntries(buffer: Buffer): Map<string, ZipEntry> {
  const entries = new Map<string, ZipEntry>()
  const eocdOffset = locateEndOfCentralDirectory(buffer)
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)

  let offset = centralDirectoryOffset
  for (let i = 0; i < totalEntries; i += 1) {
    const signature = buffer.readUInt32LE(offset)
    if (signature !== 0x02014b50) {
      throw new Error('Invalid xlsx: central directory header signature mismatch.')
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const uncompressedSize = buffer.readUInt32LE(offset + 24)
    const fileNameLength = buffer.readUInt16LE(offset + 28)
    const extraFieldLength = buffer.readUInt16LE(offset + 30)
    const fileCommentLength = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const fileName = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength)

    entries.set(fileName, {
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    })

    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength
  }

  return entries
}

function readZipEntry(buffer: Buffer, entries: Map<string, ZipEntry>, entryName: string): Buffer {
  const entry = entries.get(entryName)
  if (!entry) {
    throw new Error(`Invalid xlsx: missing entry ${entryName}`)
  }

  const localOffset = entry.localHeaderOffset
  const localSignature = buffer.readUInt32LE(localOffset)
  if (localSignature !== 0x04034b50) {
    throw new Error(`Invalid xlsx: local header signature mismatch for ${entryName}`)
  }

  const fileNameLength = buffer.readUInt16LE(localOffset + 26)
  const extraFieldLength = buffer.readUInt16LE(localOffset + 28)
  const dataStart = localOffset + 30 + fileNameLength + extraFieldLength
  const compressedData = buffer.subarray(dataStart, dataStart + entry.compressedSize)

  if (entry.compressionMethod === 0) {
    return Buffer.from(compressedData)
  }
  if (entry.compressionMethod === 8) {
    return inflateRawSync(compressedData)
  }

  throw new Error(`Unsupported zip compression method ${entry.compressionMethod} for ${entryName}`)
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = []
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g
  let siMatch: RegExpExecArray | null = siRegex.exec(xml)
  while (siMatch) {
    const siBody = siMatch[1]
    let text = ''
    const textRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g
    let textMatch: RegExpExecArray | null = textRegex.exec(siBody)
    while (textMatch) {
      text += decodeXmlEntities(textMatch[1])
      textMatch = textRegex.exec(siBody)
    }
    out.push(normalizeSpaces(text))
    siMatch = siRegex.exec(xml)
  }
  return out
}

function parseRawSheetRows(sheetXml: string, sharedStrings: string[]): RawSheetRow[] {
  const rows: RawSheetRow[] = []
  const rowRegex = /<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g
  let rowMatch: RegExpExecArray | null = rowRegex.exec(sheetXml)

  while (rowMatch) {
    const rowNumber = Number.parseInt(rowMatch[1], 10)
    const rowBody = rowMatch[2]
    const cells: Record<string, string> = {}

    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
    let cellMatch: RegExpExecArray | null = cellRegex.exec(rowBody)

    while (cellMatch) {
      const attrs = cellMatch[1] || ''
      const body = cellMatch[2] || ''
      const refMatch = attrs.match(/\br="([A-Z]+)\d+"/)
      if (!refMatch) {
        cellMatch = cellRegex.exec(rowBody)
        continue
      }

      const col = refMatch[1]
      const typeMatch = attrs.match(/\bt="([^"]+)"/)
      const cellType = typeMatch?.[1] ?? ''
      let value = ''

      if (cellType === 's') {
        const vMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)
        if (vMatch) {
          const index = Number.parseInt(vMatch[1], 10)
          value = Number.isNaN(index) ? '' : sharedStrings[index] ?? ''
        }
      } else if (cellType === 'inlineStr') {
        const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g
        let tMatch: RegExpExecArray | null = tRegex.exec(body)
        let inline = ''
        while (tMatch) {
          inline += decodeXmlEntities(tMatch[1])
          tMatch = tRegex.exec(body)
        }
        value = inline
      } else {
        const vMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)
        if (vMatch) {
          value = decodeXmlEntities(vMatch[1])
        }
      }

      cells[col] = normalizeSpaces(value)
      cellMatch = cellRegex.exec(rowBody)
    }

    rows.push({ row: rowNumber, cells })
    rowMatch = rowRegex.exec(sheetXml)
  }

  return rows
}

function isHeaderLike(description: string): boolean {
  const upper = description.toUpperCase()
  if (!upper) return true
  if (HEADER_TOKENS.has(upper)) return true
  if (upper.startsWith('PRODUCT DESCRIPTION')) return true
  if (/^[A-Z]{3}\.\s+\d{1,2}\s+\d{2}$/i.test(upper)) return true
  if (upper.includes('CALL FOR VOLUME DISCOUNTS')) return true
  return false
}

function parseNumericPrice(raw: string): number | null {
  const cleaned = raw.replace(/[$,]/g, '').trim()
  if (!cleaned) return null
  if (/^N\/?A$/i.test(cleaned)) return null
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value)) return null
  return round2(value)
}

function isMissingPriceToken(raw: string): boolean {
  return /^N\/?A$/i.test(raw.trim())
}

function hasPackPattern(value: string): boolean {
  return /\d+\s*\/\s*[\d.]+/i.test(value)
}

function startsWithPack(value: string): boolean {
  return /^\d+\s*\/\s*[\d.]+/i.test(value)
}

function looksLikeFlavor(description: string): boolean {
  const text = normalizeSpaces(description)
  if (!text) return false
  if (hasPackPattern(text)) return false
  if (/\b(PRODUCTS?|DRINKS?|WATERS?|JUICES?|TEA|SODA|CANS?|BOTTLES?|LITER|ML|OZ|NECTARS?)\b/i.test(text)) {
    return false
  }
  const words = text.split(' ').filter(Boolean)
  if (words.length === 0 || words.length > 4) return false
  return true
}

function shouldTreatAsSection(
  entry: BlockEntry,
  nextMeaningful: BlockEntry | null,
  context: SectionContext
): boolean {
  const desc = normalizeSpaces(entry.description)
  const upper = desc.toUpperCase()

  if (!desc) return false
  if (isHeaderLike(desc)) return false
  if (isMissingPriceToken(entry.priceRaw)) return false
  if (/\bPRODUCTS?\b/.test(upper)) return true
  if (startsWithPack(desc)) return true

  if (/\b(DRINKS?|WATERS?|JUICES?|TEA|SODA|CANS?|BOTTLES?|LITER|ML|OZ|NECTARS?)\b/.test(upper)) {
    return true
  }

  if (nextMeaningful) {
    if (startsWithPack(nextMeaningful.description)) {
      return true
    }
    if (parseNumericPrice(nextMeaningful.priceRaw) !== null && !looksLikeFlavor(desc)) {
      return true
    }
  }

  if (!context.brand) {
    return true
  }

  return !looksLikeFlavor(desc)
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
}

function canonicalBrandName(raw: string): string {
  const cleaned = normalizeSpaces(raw).replace(/[.:]+$/g, '')
  if (!cleaned) return cleaned
  const aliasKey = cleaned.toUpperCase().replace(/\s+/g, ' ')
  const alias = BRANDS_ALIAS[aliasKey]
  if (alias) return alias

  if (/[a-z]/.test(cleaned)) return cleaned
  return titleCase(cleaned)
}

function parseSectionHeader(description: string, context: SectionContext): SectionContext {
  const text = normalizeSpaces(description).replace(/[.:]+$/g, '')
  if (!text) return context

  if (startsWithPack(text)) {
    return {
      brand: context.brand,
      packDetails: text,
    }
  }

  const packIndex = text.search(/\d+\s*\/\s*[\d.]+/i)
  const withNoProducts = text.replace(/\bPRODUCTS?\b/gi, ' ')
  if (packIndex >= 0) {
    const prefixRaw = withNoProducts.slice(0, packIndex).trim()
    const pack = text.slice(packIndex).trim()
    return {
      brand: prefixRaw ? canonicalBrandName(prefixRaw) : context.brand,
      packDetails: pack || context.packDetails,
    }
  }

  const brand = canonicalBrandName(withNoProducts)
  return {
    brand: brand || context.brand,
    packDetails: null,
  }
}

function extractTitleAndPack(
  description: string,
  context: SectionContext
): { title: string; packDetails: string | null } {
  const text = normalizeSpaces(description)
  const packIndex = text.search(/\d+\s*\/\s*[\d.]+/i)

  if (packIndex > 0) {
    const title = normalizeSpaces(text.slice(0, packIndex))
    const pack = normalizeSpaces(text.slice(packIndex))
    return {
      title: title || text,
      packDetails: pack || context.packDetails,
    }
  }

  if (packIndex === 0) {
    return {
      title: text,
      packDetails: text,
    }
  }

  return {
    title: text,
    packDetails: context.packDetails,
  }
}

function nextMeaningfulEntry(entries: BlockEntry[], currentIndex: number): BlockEntry | null {
  for (let i = currentIndex + 1; i < entries.length; i += 1) {
    const candidate = entries[i]
    const desc = normalizeSpaces(candidate.description)
    if (!desc) continue
    if (isHeaderLike(desc)) continue
    return candidate
  }
  return null
}

function parseBlock(entries: BlockEntry[], block: Block): ParsedWorkbook {
  const products: ParsedProduct[] = []
  const skipped: SkippedRow[] = []
  let context: SectionContext = { brand: null, packDetails: null }

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]
    const description = normalizeSpaces(entry.description)
    const priceRaw = normalizeSpaces(entry.priceRaw)
    if (!description && !priceRaw) continue
    if (isHeaderLike(description)) continue

    const numericPrice = parseNumericPrice(priceRaw)
    if (numericPrice !== null) {
      if (!context.brand) {
        skipped.push({
          row: entry.row,
          block,
          description,
          priceRaw,
          reason: 'No active section/brand context',
        })
        continue
      }

      const parsed = extractTitleAndPack(description, context)
      products.push({
        row: entry.row,
        block,
        sequence: entry.row * 2 + (block === 'right' ? 1 : 0),
        brand: context.brand,
        title: parsed.title,
        packDetails: parsed.packDetails,
        price: numericPrice,
      })
      continue
    }

    if (isMissingPriceToken(priceRaw)) {
      skipped.push({
        row: entry.row,
        block,
        description,
        priceRaw,
        reason: 'Missing price token (N/A)',
      })
      continue
    }

    const next = nextMeaningfulEntry(entries, i)
    const section = shouldTreatAsSection(entry, next, context)
    if (section) {
      context = parseSectionHeader(description, context)
      continue
    }

    skipped.push({
      row: entry.row,
      block,
      description,
      priceRaw,
      reason: 'Unpriced product row',
    })
  }

  return { products, skipped }
}

function parseWorkbookFromFile(xlsxPath: string): ParsedWorkbook {
  if (!existsSync(xlsxPath)) {
    throw new Error(`XLSX file not found: ${xlsxPath}`)
  }

  const zipBuffer = readFileSync(xlsxPath)
  const zipEntries = readZipEntries(zipBuffer)

  const sharedXml = zipEntries.has('xl/sharedStrings.xml')
    ? readZipEntry(zipBuffer, zipEntries, 'xl/sharedStrings.xml').toString('utf8')
    : ''
  const sharedStrings = sharedXml ? parseSharedStrings(sharedXml) : []

  if (!zipEntries.has('xl/worksheets/sheet1.xml')) {
    throw new Error('Worksheet xl/worksheets/sheet1.xml not found in workbook.')
  }

  const sheetXml = readZipEntry(zipBuffer, zipEntries, 'xl/worksheets/sheet1.xml').toString('utf8')
  const rows = parseRawSheetRows(sheetXml, sharedStrings).sort((a, b) => a.row - b.row)

  const leftEntries: BlockEntry[] = []
  const rightEntries: BlockEntry[] = []
  for (const row of rows) {
    const leftDescription = normalizeSpaces(row.cells.A ?? '')
    const leftPrice = normalizeSpaces(row.cells.D ?? '')
    if (leftDescription || leftPrice) {
      leftEntries.push({ row: row.row, description: leftDescription, priceRaw: leftPrice })
    }

    const rightDescription = normalizeSpaces(row.cells.G ?? '')
    const rightPrice = normalizeSpaces(row.cells.J ?? '')
    if (rightDescription || rightPrice) {
      rightEntries.push({ row: row.row, description: rightDescription, priceRaw: rightPrice })
    }
  }

  const leftParsed = parseBlock(leftEntries, 'left')
  const rightParsed = parseBlock(rightEntries, 'right')
  return {
    products: [...leftParsed.products, ...rightParsed.products].sort((a, b) => a.sequence - b.sequence),
    skipped: [...leftParsed.skipped, ...rightParsed.skipped].sort((a, b) => a.row - b.row),
  }
}

function getDbUrlFromClaudeSettings(): string | undefined {
  const settingsPath = resolve(process.cwd(), '.claude', 'settings.local.json')
  if (!existsSync(settingsPath)) return undefined

  try {
    const raw = readFileSync(settingsPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      permissions?: { allow?: string[] }
    }
    const allowed = parsed.permissions?.allow ?? []
    for (const entry of allowed) {
      const match = entry.match(/SUPABASE_DB_URL="([^"]+)"/)
      if (match) {
        return match[1]
      }
    }
  } catch {
    return undefined
  }

  return undefined
}

function resolveDbUrl(explicit?: string): string | undefined {
  return (
    explicit ??
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    getDbUrlFromClaudeSettings()
  )
}

function productIdentityKey(
  brandId: string,
  title: string,
  packDetails: string | null
): string {
  return `${brandId}|${normalizeKey(title)}|${normalizeKey(packDetails)}`
}

function parsedIdentityKey(parsed: ParsedProduct): string {
  return `${normalizeKey(parsed.brand)}|${normalizeKey(parsed.title)}|${normalizeKey(parsed.packDetails)}`
}

export async function runCatalogImport(argv: string[] = process.argv.slice(2)): Promise<CatalogImportReport> {
  loadLocalEnvFiles()
  const options = parseArgs(argv)
  const parsed = parseWorkbookFromFile(options.filePath)

  const dedupedByParsedKey = new Map<string, ParsedProduct>()
  const duplicateParsedRows: ParsedProduct[] = []
  for (const product of parsed.products) {
    const key = parsedIdentityKey(product)
    if (dedupedByParsedKey.has(key)) {
      duplicateParsedRows.push(product)
    }
    dedupedByParsedKey.set(key, product)
  }
  const catalogProducts = [...dedupedByParsedKey.values()].sort((a, b) => a.sequence - b.sequence)

  const distinctBrands = new Set(catalogProducts.map((p) => normalizeKey(p.brand)))
  console.log(`Parsed priced product rows: ${parsed.products.length}`)
  console.log(`Unique products after dedupe: ${catalogProducts.length}`)
  console.log(`Distinct brands from workbook: ${distinctBrands.size}`)
  console.log(`Skipped rows: ${parsed.skipped.length}`)
  if (duplicateParsedRows.length > 0) {
    console.log(`Duplicate workbook rows collapsed by key: ${duplicateParsedRows.length}`)
  }

  const baseReport: CatalogImportReport = {
    mode: options.apply ? 'apply' : 'dry-run',
    workbookPath: options.filePath,
    parsedPricedRows: parsed.products.length,
    uniqueProducts: catalogProducts.length,
    distinctBrands: distinctBrands.size,
    skippedRows: parsed.skipped.length,
    duplicateWorkbookRows: duplicateParsedRows.length,
    brandsToCreate: 0,
    createdBrands: 0,
    productsToInsert: 0,
    productsToUpdate: 0,
    productsUnchanged: 0,
    unresolvedBrandProducts: 0,
  }

  if (parsed.skipped.length > 0) {
    const byReason = new Map<string, number>()
    for (const row of parsed.skipped) {
      byReason.set(row.reason, (byReason.get(row.reason) ?? 0) + 1)
    }
    console.log('Skipped by reason:')
    for (const [reason, count] of byReason.entries()) {
      console.log(`  - ${reason}: ${count}`)
    }
    const sample = parsed.skipped.slice(0, 12)
    if (sample.length > 0) {
      console.log('Skipped sample:')
      for (const row of sample) {
        console.log(
          `  - row ${row.row} (${row.block}) "${row.description}" price="${row.priceRaw}" -> ${row.reason}`
        )
      }
    }
  }

  const dbUrl = resolveDbUrl(options.dbUrl)
  if (!dbUrl) {
    console.log('No DB URL found; dry-run parse complete (no database actions).')
    return baseReport
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const brandsResult = await client.query<ExistingBrandRow>(
      'select id, name, sort_order from brands'
    )
    const existingBrands = brandsResult.rows
    const brandByKey = new Map<string, ExistingBrandRow>()
    for (const brand of existingBrands) {
      brandByKey.set(normalizeKey(brand.name), brand)
    }

    let nextBrandSortOrder = existingBrands.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1
    const missingBrandNames: string[] = []
    for (const product of catalogProducts) {
      const key = normalizeKey(product.brand)
      if (!brandByKey.has(key)) {
        brandByKey.set(key, { id: '', name: product.brand, sort_order: nextBrandSortOrder })
        missingBrandNames.push(product.brand)
      }
    }

    const uniqueMissingBrands = [...new Set(missingBrandNames.map((v) => normalizeSpaces(v)))]
    console.log(`Brands to create: ${uniqueMissingBrands.length}`)
    baseReport.brandsToCreate = uniqueMissingBrands.length

    if (options.apply && uniqueMissingBrands.length > 0) {
      await client.query('begin')
      for (const brandName of uniqueMissingBrands) {
        const inserted = await client.query<ExistingBrandRow>(
          'insert into brands (name, sort_order) values ($1, $2) returning id, name, sort_order',
          [brandName, nextBrandSortOrder]
        )
        const row = inserted.rows[0]
        brandByKey.set(normalizeKey(row.name), row)
        nextBrandSortOrder += 1
      }
      await client.query('commit')
      console.log(`Created brands: ${uniqueMissingBrands.length}`)
      baseReport.createdBrands = uniqueMissingBrands.length
    } else if (!options.apply && uniqueMissingBrands.length > 0) {
      console.log('Brand creation preview:')
      for (const name of uniqueMissingBrands.slice(0, 40)) {
        console.log(`  - ${name}`)
      }
      if (uniqueMissingBrands.length > 40) {
        console.log(`  ...and ${uniqueMissingBrands.length - 40} more`)
      }
    }

    const productsResult = await client.query<ExistingProductRow>(
      'select id, brand_id, title, pack_details, price, sort_order, is_discontinued from products'
    )
    const existingProducts = productsResult.rows
    const existingByIdentity = new Map<string, ExistingProductRow>()
    let existingDuplicateIdentities = 0
    for (const row of existingProducts) {
      if (!row.brand_id) continue
      const key = productIdentityKey(row.brand_id, row.title, row.pack_details)
      if (existingByIdentity.has(key)) {
        existingDuplicateIdentities += 1
        continue
      }
      existingByIdentity.set(key, row)
    }
    if (existingDuplicateIdentities > 0) {
      console.log(`Existing DB duplicate identities detected: ${existingDuplicateIdentities}`)
    }

    const inserts: ParsedProduct[] = []
    const updates: Array<{ id: string; price: number }> = []
    let unchanged = 0
    let unresolvedBrand = 0

    let nextProductSortOrder = existingProducts.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1
    for (const product of catalogProducts) {
      const brandRow = brandByKey.get(normalizeKey(product.brand))
      if (!brandRow?.id) {
        unresolvedBrand += 1
        continue
      }

      const key = productIdentityKey(brandRow.id, product.title, product.packDetails)
      const existing = existingByIdentity.get(key)
      if (!existing) {
        inserts.push(product)
        continue
      }

      const changedPrice = round2(existing.price) !== round2(product.price)
      if (changedPrice || existing.is_discontinued) {
        updates.push({ id: existing.id, price: product.price })
      } else {
        unchanged += 1
      }
    }

    console.log(`Products to insert: ${inserts.length}`)
    console.log(`Products to update: ${updates.length}`)
    console.log(`Products unchanged: ${unchanged}`)
    if (unresolvedBrand > 0) {
      console.log(`Products skipped due to unresolved brand: ${unresolvedBrand}`)
    }
    baseReport.productsToInsert = inserts.length
    baseReport.productsToUpdate = updates.length
    baseReport.productsUnchanged = unchanged
    baseReport.unresolvedBrandProducts = unresolvedBrand

    if (!options.apply) {
      console.log('Dry-run complete. Use --apply to persist changes.')
      return baseReport
    }

    await client.query('begin')
    for (const row of updates) {
      await client.query(
        'update products set price = $1, is_discontinued = false where id = $2',
        [row.price, row.id]
      )
    }

    for (const row of inserts) {
      const brandRow = brandByKey.get(normalizeKey(row.brand))
      if (!brandRow?.id) continue
      await client.query(
        `insert into products (
          brand_id, title, pack_details, price, is_new, is_discontinued, sort_order
        ) values ($1, $2, $3, $4, false, false, $5)`,
        [brandRow.id, row.title, row.packDetails, row.price, nextProductSortOrder]
      )
      nextProductSortOrder += 1
    }
    await client.query('commit')

    console.log('Catalog upload completed.')
    console.log(`Inserted products: ${inserts.length}`)
    console.log(`Updated products: ${updates.length}`)
    return baseReport
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

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  runCatalogImport().catch((error) => {
    const message = formatError(error)
    console.error(`Import failed: ${message}`)
    process.exit(1)
  })
}
