import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export type Block = 'left' | 'right'
export type HeaderKind = 'brand_with_pack' | 'brand_only' | 'pack_only'
export type RowMode = 'flavor_only' | 'pack_only' | 'flavor_with_inline_pack' | 'mixed' | 'empty'

interface CliOptions {
  command: 'extract' | 'approve' | 'build'
  pdfPath: string | null
  templatePath: string | null
  outDir: string
  sectionId: string | null
  brandNameOverride: string | null
  packDetailsOverride: string | null
  force: boolean
  pythonCommand: string | null
  splitColumn: number
}

interface LayoutPage {
  pageNumber: number
  lines: string[]
}

interface PdfLayoutPayload {
  pages: LayoutPage[]
}

interface ParsedLine {
  rawText: string
  description: string
  priceRaw: string | null
  price: number | null
}

interface SectionContext {
  brandName: string | null
  packDetails: string | null
  sourceSectionId: string | null
}

interface SourceRow {
  pageNumber: number
  lineNumber: number
  block: Block
  description: string
  priceRaw: string
  price: number
}

interface ReviewIssue {
  code: string
  severity: 'warning' | 'blocking'
  message: string
  rowLineNumber?: number
}

interface ProposedPackFields {
  packDetails: string | null
  packCount: number | null
  sizeValue: number | null
  sizeUom: string | null
}

interface HeaderProposal extends ProposedPackFields {
  headerKind: HeaderKind
  brandName: string | null
  cleanup: string[]
}

interface SectionRuleProposal extends HeaderProposal {
  rowMode: RowMode
  autoAppendBlocked: boolean
}

export interface ProductTemplateRow {
  brand_name: string
  title: string
  pack_details: string
  pack_count: number | ''
  size_value: number | ''
  size_uom: string
  price: number
  image_url: string
  tags: string
  is_new: boolean
  is_discontinued: boolean
}

interface RowProposal {
  rowIndex: number
  source: SourceRow
  output: ProductTemplateRow
  flags: string[]
  blockingFlags: string[]
}

export interface SectionReview {
  id: string
  sequence: number
  pageNumber: number
  lineNumber: number
  block: Block
  rawSectionHeader: string
  inheritedContext: SectionContext
  proposedRule: SectionRuleProposal
  rawRows: SourceRow[]
  proposedRows: RowProposal[]
  issues: ReviewIssue[]
}

interface SectionBuilder {
  sequence: number
  pageNumber: number
  lineNumber: number
  block: Block
  rawSectionHeader: string
  inheritedContext: SectionContext
  headerProposal: HeaderProposal
  rawRows: SourceRow[]
}

interface ExceptionRow {
  sectionId: string | null
  page_number: number
  block: Block
  raw_section_header: string | null
  line_number: number
  description: string
  price_raw: string
  reason: string
}

interface WorkflowManifest {
  version: number
  createdAt: string
  pdfPath: string
  templatePath: string | null
  splitColumn: number
  sections: SectionReview[]
  exceptions: ExceptionRow[]
}

interface ApprovedSection {
  sectionId: string
  approvedAt: string
  rawSectionHeader: string
  pageNumber: number
  block: Block
  proposedRule: SectionRuleProposal
  issues: ReviewIssue[]
  rows: RowProposal[]
}

interface ApprovedRulesLedger {
  version: number
  createdAt: string
  updatedAt: string
  pdfPath: string
  templatePath: string | null
  approvedSections: ApprovedSection[]
}

interface ParsedPack {
  packCount: number
  sizeValue: number
  sizeUom: string
  tail: string
}

interface InlinePackSplit extends ProposedPackFields {
  prefix: string
  suffixTitle: string
}

const DEFAULT_OUTPUT_DIR = resolve(process.cwd(), 'output', 'section-gated-pdf-import')
const DEFAULT_SPLIT_COLUMN = 82
const DEFAULT_HEADERS = [
  'brand_name',
  'title',
  'pack_details',
  'pack_count',
  'size_value',
  'size_uom',
  'price',
  'image_url',
  'tags',
  'is_new',
  'is_discontinued',
]

const HEADER_NOISE = new Set([
  'PRODUCT',
  'DESCRIPTION',
  'CASE',
  'COST',
  'PRODUCT DESCRIPTION',
  'PRODUCT DESCRIPTION CASE',
  'DESCRIPTION COST',
  'PRODUCT CASE',
  'PRODUCT CASE DESCRIPTION COST',
  'DESCRIPTION CASE',
  'CASE DESCRIPTION COST',
])

const PRICE_REGEX = /^(.*?)\s*\(?\$\s*([0-9]+(?:\.[0-9]{2})?)\)?\s*$/
const PACK_START_REGEX = /\d+\s*\/\s*[0-9]+(?:\.[0-9]+)?/i
const ALLOWED_UOM = new Set(['OZ', 'ML', 'LITER', 'LITERS', 'GALLON', 'GALLONS', 'CT', 'ROLL', 'ROLLS'])
const PACKAGING_TAILS = new Set([
  'BOTTLE',
  'BOTTLES',
  'CAP',
  'CAN',
  'CANS',
  'CLEAR',
  'GLASS',
  'PLASTIC',
  'ROLL',
  'ROLLS',
  'SPORTS',
  'SPORTS CAP',
])

const BRAND_ALIASES: Record<string, string> = {
  COKE: 'Coca-Cola',
  'COCA COLA': 'Coca-Cola',
  'COKE FLAVORED MINI': 'Coca-Cola',
  'COKE FLAVORED SLIM': 'Coca-Cola',
  PEPSI: 'Pepsi',
  'DR PEPPER': 'Dr Pepper',
  'DR. PEPPER': 'Dr Pepper',
  'CANADA DRY': 'Canada Dry',
  FRAPUCCINO: 'Frappuccino',
  'GLACAU VITAMIN WATER': 'Glaceau Vitamin Water',
  PELLIGRINO: 'Pellegrino',
  'RED BULL': 'Red Bull',
  'V-8': 'V-8',
  'YOO-HOO': 'Yoo-Hoo',
}

const TYPO_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bArtic\b/gi, replacement: 'Arctic' },
  { pattern: /\bBluberry\b/gi, replacement: 'Blueberry' },
  { pattern: /\bCaffiene\b/gi, replacement: 'Caffeine' },
  { pattern: /\bCarmel\b/gi, replacement: 'Caramel' },
  { pattern: /\bChr?rry\b/gi, replacement: 'Cherry' },
  { pattern: /\bFrapuccino\b/gi, replacement: 'Frappuccino' },
  { pattern: /\bGlacau\b/gi, replacement: 'Glaceau' },
  { pattern: /\bHawaiin\b/gi, replacement: 'Hawaiian' },
  { pattern: /\bLemon Ade\b/gi, replacement: 'Lemonade' },
  { pattern: /\bMount\.\b/gi, replacement: 'Mountain' },
  { pattern: /\bPelligrino\b/gi, replacement: 'Pellegrino' },
]

function normalizeSpaces(value: string | null | undefined): string {
  return (value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeUpper(value: string | null | undefined): string {
  return normalizeSpaces(value).toUpperCase()
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function slugify(value: string): string {
  const collapsed = normalizeUpper(value).replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return collapsed.length > 0 ? collapsed.toLowerCase() : 'section'
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
}

function normalizeDisplayText(value: string): string {
  const trimmed = normalizeSpaces(value)
  if (!trimmed) return trimmed
  return /[a-z]/.test(trimmed) ? trimmed : titleCase(trimmed)
}

function cleanApprovedText(value: string): string {
  let cleaned = normalizeDisplayText(value)
  for (const { pattern, replacement } of TYPO_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement)
  }
  cleaned = cleaned.replace(/([A-Za-z])'S\b/g, "$1's")
  return normalizeSpaces(cleaned)
}

function formatSizeValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
}

function formatStructuredPack(packCount: number, sizeValue: number, sizeUom: string): string {
  return `${packCount}/${formatSizeValue(sizeValue)} ${normalizeUpper(sizeUom)}`
}

function stripHeaderNoise(value: string): string {
  return normalizeSpaces(value.replace(/\bCOST\b$/i, '').replace(/[.:]+$/g, ''))
}

function isHeaderNoise(value: string): boolean {
  const upper = normalizeUpper(value)
  if (!upper) return true
  if (HEADER_NOISE.has(upper)) return true
  if (/^MAR\.\s+\d{1,2}\s+\d{2}$/i.test(upper)) return true
  if (upper.includes('CALL FOR VOLUME DISCOUNTS')) return true
  return false
}

function parseLine(rawText: string): ParsedLine {
  const cleaned = stripHeaderNoise(rawText)
  const priceMatch = cleaned.match(PRICE_REGEX)
  if (!priceMatch) {
    return {
      rawText: cleaned,
      description: cleaned,
      priceRaw: null,
      price: null,
    }
  }

  return {
    rawText: cleaned,
    description: normalizeSpaces(priceMatch[1]),
    priceRaw: priceMatch[2],
    price: round2(Number(priceMatch[2])),
  }
}

function parsePack(value: string | null | undefined): ParsedPack | null {
  const src = normalizeUpper(value)
  if (!src) return null

  const match = src.match(
    /^\s*(\d+)\s*\/\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\.|-|\s)?\s*(OZ|ML|LITER|LITERS|GALLON|GALLONS|CT|ROLLS?|ROLL)\b(.*)$/i
  )
  if (!match) return null

  const packCount = Number(match[1])
  const sizeValue = Number(match[2])
  const sizeUom = normalizeUpper(match[3]).replace(/\.$/, '')
  const tail = normalizeSpaces(match[4])

  if (!Number.isInteger(packCount) || packCount <= 0) return null
  if (!Number.isFinite(sizeValue) || sizeValue <= 0) return null
  if (!ALLOWED_UOM.has(sizeUom)) return null

  return { packCount, sizeValue, sizeUom, tail }
}

function isPackagingTailOnly(tail: string): boolean {
  const normalized = normalizeUpper(tail)
  if (!normalized) return true
  return normalized
    .split(/\s+/)
    .every((token) => PACKAGING_TAILS.has(token) || token === '&')
}

function normalizePackDetails(value: string | null | undefined): ProposedPackFields {
  const parsed = parsePack(value)
  if (!parsed) {
    return {
      packDetails: normalizeSpaces(value) || null,
      packCount: null,
      sizeValue: null,
      sizeUom: null,
    }
  }

  const base = formatStructuredPack(parsed.packCount, parsed.sizeValue, parsed.sizeUom)
  const packDetails =
    parsed.tail && isPackagingTailOnly(parsed.tail) ? `${base} ${normalizeUpper(parsed.tail)}` : base

  return {
    packDetails,
    packCount: parsed.packCount,
    sizeValue: parsed.sizeValue,
    sizeUom: parsed.sizeUom,
  }
}

function extractInlinePack(value: string, brandName: string | null, rawHeader: string): InlinePackSplit | null {
  const text = normalizeSpaces(value)
  const packIndex = text.search(PACK_START_REGEX)
  if (packIndex < 0) return null

  const prefix = normalizeSpaces(text.slice(0, packIndex))
  const packSegment = normalizeSpaces(text.slice(packIndex))
  const normalized = normalizePackDetails(packSegment)
  const parsed = parsePack(packSegment)

  let suffixTitle = ''
  if (parsed?.tail && !isPackagingTailOnly(parsed.tail)) {
    suffixTitle = normalizeDisplayText(parsed.tail)
  }

  const normalizedPrefix = normalizeUpper(prefix)
  const normalizedBrand = normalizeUpper(brandName)
  const headerPrefix = normalizeUpper(
    stripHeaderNoise(rawHeader).replace(PACK_START_REGEX, '').replace(/\bPRODUCTS?\b/gi, '')
  )
  const brandFirstWord = normalizeUpper((brandName ?? '').split(' ')[0])
  const prefixIsGenericBrand =
    normalizedPrefix.length > 0 &&
    (normalizedPrefix === normalizedBrand ||
      normalizedPrefix === headerPrefix ||
      normalizedPrefix === brandFirstWord)

  if (prefixIsGenericBrand && suffixTitle) {
    return {
      prefix: '',
      suffixTitle,
      ...normalized,
    }
  }

  return {
    prefix: normalizeDisplayText(prefix),
    suffixTitle,
    ...normalized,
  }
}

function canonicalBrandName(raw: string): string {
  const cleaned = normalizeSpaces(raw)
  if (!cleaned) return ''

  let withoutProducts = cleaned.replace(/\bPRODUCTS?\b/gi, ' ')
  withoutProducts = withoutProducts.replace(/\$\s*[0-9]+(?:\.[0-9]+)?/g, ' ')
  withoutProducts = withoutProducts.replace(/\b[0-9]+(?:\.[0-9]+)?\s*CENTS?\b/gi, ' ')
  const packagingMarker = withoutProducts.search(/\b(PLASTIC|BOTTLES?|CANS?|GLASS|SPORTS CAP)\b/i)
  if (packagingMarker > 0) {
    withoutProducts = withoutProducts.slice(0, packagingMarker)
  }

  const normalized = normalizeUpper(withoutProducts)
  if (!normalized) return ''

  const alias = BRAND_ALIASES[normalized]
  if (alias) return alias

  if (normalized.startsWith('COKE')) return 'Coca-Cola'
  if (normalized.startsWith('PEPSI')) return 'Pepsi'
  if (normalized.startsWith('CANADA DRY')) return 'Canada Dry'
  if (normalized.startsWith('RED BULL')) return 'Red Bull'

  return normalizeDisplayText(withoutProducts)
}

function parseSectionHeader(rawHeader: string, inheritedContext: SectionContext): HeaderProposal {
  const cleaned = stripHeaderNoise(rawHeader)
  const packStart = cleaned.search(PACK_START_REGEX)

  if (packStart === 0) {
    const normalized = normalizePackDetails(cleaned)
    return {
      headerKind: 'pack_only',
      brandName: inheritedContext.brandName,
      cleanup: inheritedContext.brandName ? ['inherit_brand_from_previous_section'] : [],
      ...normalized,
    }
  }

  if (packStart > 0) {
    const prefix = normalizeSpaces(cleaned.slice(0, packStart))
    const packText = normalizeSpaces(cleaned.slice(packStart))
    return {
      headerKind: 'brand_with_pack',
      brandName: canonicalBrandName(prefix),
      cleanup: [],
      ...normalizePackDetails(packText),
    }
  }

  return {
    headerKind: 'brand_only',
    brandName: canonicalBrandName(cleaned),
    packDetails: null,
    packCount: null,
    sizeValue: null,
    sizeUom: null,
    cleanup: [],
  }
}

function deriveRowMode(rows: SourceRow[]): RowMode {
  if (rows.length === 0) return 'empty'

  let inlineCount = 0
  let startingPackCount = 0
  for (const row of rows) {
    const hasPack = PACK_START_REGEX.test(row.description)
    if (hasPack) inlineCount += 1
    if (/^\s*\d+\s*\/\s*[0-9]+(?:\.[0-9]+)?/i.test(row.description)) {
      startingPackCount += 1
    }
  }

  if (inlineCount === 0) return 'flavor_only'
  if (startingPackCount === rows.length) return 'pack_only'
  if (inlineCount === rows.length) return 'flavor_with_inline_pack'
  return 'mixed'
}

function createEmptyTemplateRow(brandName: string, title: string, price: number): ProductTemplateRow {
  return {
    brand_name: brandName,
    title,
    pack_details: '',
    pack_count: '',
    size_value: '',
    size_uom: '',
    price,
    image_url: '',
    tags: '',
    is_new: false,
    is_discontinued: false,
  }
}

export function applyApprovalCleanup(row: ProductTemplateRow): ProductTemplateRow {
  return {
    ...row,
    brand_name: cleanApprovedText(row.brand_name),
    title: cleanApprovedText(row.title),
  }
}

function mergePackFields(target: ProductTemplateRow, fields: ProposedPackFields) {
  target.pack_details = fields.packDetails ?? ''
  target.pack_count = fields.packCount ?? ''
  target.size_value = fields.sizeValue ?? ''
  target.size_uom = fields.sizeUom ?? ''
}

function proposeRowOutput(section: SectionBuilder, rowMode: RowMode, source: SourceRow, rowIndex: number): RowProposal {
  const brandName = section.headerProposal.brandName ?? ''
  const headerPack = {
    packDetails: section.headerProposal.packDetails,
    packCount: section.headerProposal.packCount,
    sizeValue: section.headerProposal.sizeValue,
    sizeUom: section.headerProposal.sizeUom,
  }
  const inlinePack = extractInlinePack(source.description, section.headerProposal.brandName, section.rawSectionHeader)
  const flags: string[] = []
  const blockingFlags: string[] = []

  let title = ''
  let chosenPack = headerPack

  if (rowMode === 'flavor_only') {
    title = normalizeDisplayText(source.description)
    if (!headerPack.packDetails) {
      blockingFlags.push('missing_section_pack_details')
    }
  } else if (rowMode === 'pack_only') {
    if (inlinePack) {
      chosenPack = inlinePack
      if (inlinePack.suffixTitle) {
        title = inlinePack.suffixTitle
        flags.push('title_from_inline_pack_suffix')
      } else {
        title = normalizeDisplayText(section.headerProposal.brandName ?? section.rawSectionHeader)
        flags.push('generic_brand_title_fallback')
      }
    } else {
      title = normalizeDisplayText(section.headerProposal.brandName ?? section.rawSectionHeader)
      chosenPack = normalizePackDetails(source.description)
      flags.push('generic_brand_title_fallback')
    }
  } else {
    if (inlinePack) {
      chosenPack = inlinePack
      if (inlinePack.prefix) {
        title = inlinePack.prefix
      } else if (inlinePack.suffixTitle) {
        title = inlinePack.suffixTitle
        flags.push('title_from_inline_pack_suffix')
      } else {
        title = normalizeDisplayText(section.headerProposal.brandName ?? section.rawSectionHeader)
        flags.push('generic_brand_title_fallback')
      }

      if (
        rowMode === 'mixed' &&
        headerPack.packDetails &&
        chosenPack.packDetails &&
        normalizeUpper(headerPack.packDetails) !== normalizeUpper(chosenPack.packDetails)
      ) {
        flags.push('inline_pack_overrides_section_pack')
      }
    } else {
      title = normalizeDisplayText(source.description)
      chosenPack = headerPack
      if (!headerPack.packDetails) {
        blockingFlags.push('missing_pack_details')
      }
    }
  }

  if (!brandName) {
    blockingFlags.push('missing_brand_name')
  }
  if (!title) {
    blockingFlags.push('missing_title')
  }

  const output = createEmptyTemplateRow(brandName, title, source.price)
  mergePackFields(output, chosenPack)

  return {
    rowIndex,
    source,
    output,
    flags,
    blockingFlags,
  }
}

function buildSectionReview(section: SectionBuilder): SectionReview {
  const rowMode = deriveRowMode(section.rawRows)
  const issues: ReviewIssue[] = []
  const proposedRows = section.rawRows.map((row, index) => proposeRowOutput(section, rowMode, row, index))

  if (!section.headerProposal.brandName) {
    issues.push({
      code: 'missing_brand_name',
      severity: 'blocking',
      message: 'Section does not resolve to a brand name.',
    })
  }

  if (section.headerProposal.headerKind === 'pack_only' && !section.inheritedContext.brandName) {
    issues.push({
      code: 'missing_inherited_brand',
      severity: 'blocking',
      message: 'Pack-only header has no inherited brand context.',
    })
  }

  if (rowMode === 'empty') {
    issues.push({
      code: 'empty_section',
      severity: 'blocking',
      message: 'Section has no priced rows.',
    })
  }

  if (rowMode === 'mixed') {
    issues.push({
      code: 'mixed_row_mode',
      severity: 'blocking',
      message: 'Section mixes header-pack rows and inline-pack rows; review before approval.',
    })
  }

  if (rowMode === 'flavor_only' && !section.headerProposal.packDetails) {
    issues.push({
      code: 'missing_section_pack',
      severity: 'blocking',
      message: 'Rows are flavor-only but the section header does not supply pack details.',
    })
  }

  for (const row of proposedRows) {
    for (const flag of row.blockingFlags) {
      issues.push({
        code: flag,
        severity: 'blocking',
        message: `Row ${row.rowIndex + 1} cannot be appended automatically: ${flag}.`,
        rowLineNumber: row.source.lineNumber,
      })
    }
  }

  return {
    id: `section-${String(section.sequence).padStart(3, '0')}-${section.block}-p${String(section.pageNumber).padStart(2, '0')}-${slugify(section.rawSectionHeader)}`,
    sequence: section.sequence,
    pageNumber: section.pageNumber,
    lineNumber: section.lineNumber,
    block: section.block,
    rawSectionHeader: section.rawSectionHeader,
    inheritedContext: section.inheritedContext,
    proposedRule: {
      ...section.headerProposal,
      rowMode,
      autoAppendBlocked: issues.some((issue) => issue.severity === 'blocking'),
    },
    rawRows: section.rawRows,
    proposedRows,
    issues,
  }
}

export function extractSectionsFromLayoutPages(pages: LayoutPage[], splitColumn = DEFAULT_SPLIT_COLUMN) {
  const sections: SectionReview[] = []
  const exceptions: ExceptionRow[] = []
  const state: Record<Block, { current: SectionBuilder | null; context: SectionContext }> = {
    left: {
      current: null,
      context: { brandName: null, packDetails: null, sourceSectionId: null },
    },
    right: {
      current: null,
      context: { brandName: null, packDetails: null, sourceSectionId: null },
    },
  }

  let sequence = 1

  const flushSection = (block: Block) => {
    const current = state[block].current
    if (!current) return
    const review = buildSectionReview(current)
    sections.push(review)
    state[block].current = null
    state[block].context = {
      brandName: review.proposedRule.brandName,
      packDetails: review.proposedRule.packDetails,
      sourceSectionId: review.id,
    }
  }

  for (const page of pages) {
    for (let lineIndex = 0; lineIndex < page.lines.length; lineIndex += 1) {
      const rawLine = page.lines[lineIndex]
      const lineByBlock: Record<Block, string> = {
        left: rawLine.slice(0, splitColumn),
        right: rawLine.slice(splitColumn),
      }

      for (const block of ['left', 'right'] as const) {
        const columnText = normalizeSpaces(lineByBlock[block])
        if (!columnText || isHeaderNoise(columnText)) continue

        const parsed = parseLine(columnText)
        if (parsed.price !== null && parsed.priceRaw !== null) {
          if (!state[block].current) {
            exceptions.push({
              sectionId: null,
              page_number: page.pageNumber,
              block,
              raw_section_header: null,
              line_number: lineIndex + 1,
              description: parsed.description,
              price_raw: parsed.priceRaw,
              reason: 'priced_row_without_active_section',
            })
            continue
          }

          state[block].current.rawRows.push({
            pageNumber: page.pageNumber,
            lineNumber: lineIndex + 1,
            block,
            description: parsed.description,
            priceRaw: parsed.priceRaw,
            price: parsed.price,
          })
          continue
        }

        flushSection(block)
        const inheritedContext = { ...state[block].context }
        state[block].current = {
          sequence,
          pageNumber: page.pageNumber,
          lineNumber: lineIndex + 1,
          block,
          rawSectionHeader: parsed.description,
          inheritedContext,
          headerProposal: parseSectionHeader(parsed.description, inheritedContext),
          rawRows: [],
        }
        sequence += 1
      }
    }
  }

  flushSection('left')
  flushSection('right')

  return { sections, exceptions }
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

type CsvCell = string | number | boolean | null | undefined

function buildCsv<T extends object>(rows: T[], headers: string[]): string {
  const headerLine = headers.map(csvEscape).join(',')
  const body = rows.map((row) =>
    headers
      .map((header) => csvEscape((row as Record<string, CsvCell>)[header]))
      .join(',')
  )
  return [headerLine, ...body].join('\n')
}

function writeJsonFile(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function ensureDirectory(path: string) {
  mkdirSync(path, { recursive: true })
}

function resolvePythonCandidates(override: string | null): Array<{ command: string; args: string[] }> {
  const candidates: Array<{ command: string; args: string[] }> = []
  if (override) candidates.push({ command: override, args: [] })
  if (process.env.PDF_IMPORT_PYTHON) candidates.push({ command: process.env.PDF_IMPORT_PYTHON, args: [] })
  candidates.push({ command: 'python', args: [] })
  candidates.push({ command: 'python3', args: [] })
  candidates.push({ command: 'py', args: ['-3'] })
  return candidates
}

function extractPdfLayout(pdfPath: string, pythonCommand: string | null): PdfLayoutPayload {
  const helperPath = resolve(dirname(fileURLToPath(import.meta.url)), 'extract-pdf-layout.py')
  const errors: string[] = []

  for (const candidate of resolvePythonCandidates(pythonCommand)) {
    const result = spawnSync(candidate.command, [...candidate.args, helperPath, pdfPath], {
      encoding: 'utf8',
    })

    if (result.error) {
      errors.push(`${candidate.command}: ${result.error.message}`)
      continue
    }

    if (result.status !== 0) {
      errors.push(`${candidate.command}: ${result.stderr.trim() || 'unknown error'}`)
      continue
    }

    try {
      return JSON.parse(result.stdout) as PdfLayoutPayload
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${candidate.command}: invalid JSON output (${message})`)
    }
  }

  throw new Error(
    `Unable to extract PDF layout. Tried: ${errors.join(' | ')}. ` +
      'Set PDF_IMPORT_PYTHON or pass --python to a Python interpreter with pypdf installed.'
  )
}

function applySectionOverrides(
  section: SectionReview,
  overrides: { brandName?: string | null; packDetails?: string | null }
): SectionReview {
  const nextBrandName =
    overrides.brandName !== undefined && overrides.brandName !== null
      ? cleanApprovedText(overrides.brandName)
      : section.proposedRule.brandName
  const packOverrideFields =
    overrides.packDetails !== undefined && overrides.packDetails !== null
      ? normalizePackDetails(overrides.packDetails)
      : null
  const hasBrandOverride = overrides.brandName !== undefined && overrides.brandName !== null
  const hasPackOverride = overrides.packDetails !== undefined && overrides.packDetails !== null

  const nextRows = section.proposedRows.map((row) => ({
    ...row,
    output: {
      ...row.output,
      brand_name: nextBrandName ?? row.output.brand_name,
      pack_details: packOverrideFields?.packDetails ?? row.output.pack_details,
      pack_count: packOverrideFields?.packCount ?? row.output.pack_count,
      size_value: packOverrideFields?.sizeValue ?? row.output.size_value,
      size_uom: packOverrideFields?.sizeUom ?? row.output.size_uom,
    },
    blockingFlags: row.blockingFlags.filter((flag) => {
      if (hasBrandOverride && (flag === 'missing_brand_name' || flag === 'missing_inherited_brand')) {
        return false
      }
      if (hasPackOverride && (flag === 'missing_section_pack_details' || flag === 'missing_pack_details')) {
        return false
      }
      return true
    }),
  }))

  const nextIssues = section.issues.filter((issue) => {
    if (hasBrandOverride && (issue.code === 'missing_brand_name' || issue.code === 'missing_inherited_brand')) {
      return false
    }
    if (hasPackOverride && (issue.code === 'missing_section_pack' || issue.code === 'missing_section_pack_details' || issue.code === 'missing_pack_details')) {
      return false
    }
    return true
  })

  return {
    ...section,
    proposedRule: {
      ...section.proposedRule,
      brandName: nextBrandName,
      packDetails: packOverrideFields?.packDetails ?? section.proposedRule.packDetails,
      packCount: packOverrideFields?.packCount ?? section.proposedRule.packCount,
      sizeValue: packOverrideFields?.sizeValue ?? section.proposedRule.sizeValue,
      sizeUom: packOverrideFields?.sizeUom ?? section.proposedRule.sizeUom,
      autoAppendBlocked: nextIssues.some((issue) => issue.severity === 'blocking'),
    },
    proposedRows: nextRows,
    issues: nextIssues,
  }
}

function parseArgs(argv: string[]): CliOptions {
  const [commandArg, ...rest] = argv
  if (!commandArg || !['extract', 'approve', 'build'].includes(commandArg)) {
    printHelp()
    process.exit(commandArg ? 1 : 0)
  }

  let pdfPath: string | null = null
  let templatePath: string | null = null
  let outDir = DEFAULT_OUTPUT_DIR
  let sectionId: string | null = null
  let brandNameOverride: string | null = null
  let packDetailsOverride: string | null = null
  let force = false
  let pythonCommand: string | null = null
  let splitColumn = DEFAULT_SPLIT_COLUMN

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i]
    if (arg === '--pdf' && rest[i + 1]) {
      pdfPath = resolve(process.cwd(), rest[i + 1])
      i += 1
      continue
    }
    if (arg === '--template' && rest[i + 1]) {
      templatePath = resolve(process.cwd(), rest[i + 1])
      i += 1
      continue
    }
    if (arg === '--out-dir' && rest[i + 1]) {
      outDir = resolve(process.cwd(), rest[i + 1])
      i += 1
      continue
    }
    if (arg === '--section' && rest[i + 1]) {
      sectionId = rest[i + 1]
      i += 1
      continue
    }
    if (arg === '--brand-name' && rest[i + 1]) {
      brandNameOverride = rest[i + 1]
      i += 1
      continue
    }
    if (arg === '--pack-details' && rest[i + 1]) {
      packDetailsOverride = rest[i + 1]
      i += 1
      continue
    }
    if (arg === '--python' && rest[i + 1]) {
      pythonCommand = rest[i + 1]
      i += 1
      continue
    }
    if (arg === '--split-column' && rest[i + 1]) {
      splitColumn = Number(rest[i + 1])
      i += 1
      continue
    }
    if (arg === '--force') {
      force = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return {
    command: commandArg as CliOptions['command'],
    pdfPath,
    templatePath,
    outDir,
    sectionId,
    brandNameOverride,
    packDetailsOverride,
    force,
    pythonCommand,
    splitColumn,
  }
}

function printHelp() {
  console.log(
    [
      'Usage: node --experimental-strip-types scripts/section-gated-pdf-import.ts <command> [options]',
      '',
      'Commands:',
      '  extract   Parse the PDF into section review artifacts and initialize the approval ledger.',
      '  approve   Copy one reviewed section into approved-section-rules.json.',
      '  build     Build staging-products.csv, brands.csv, sizes.csv, and exceptions.csv from approved sections.',
      '',
      'Common options:',
      '  --out-dir <path>       Output directory. Defaults to output/section-gated-pdf-import.',
      '',
      'extract options:',
      '  --pdf <path>           Source PDF path.',
      '  --template <path>      Product template CSV path (stored in the manifest).',
      '  --python <command>     Python interpreter with pypdf installed.',
      '  --split-column <n>     Fixed layout split for left/right columns. Defaults to 82.',
      '',
      'approve options:',
      '  --section <id>         Section id to approve from the extracted review artifacts.',
      '  --brand-name <value>   Override the approved brand_name for the entire section.',
      '  --pack-details <value> Override the approved pack details for the entire section.',
      '  --force                Approve even when the section has blocking issues.',
      '',
      'build options:',
      '  --template <path>      Override template path when building CSV outputs.',
    ].join('\n')
  )
}

function manifestPath(outDir: string): string {
  return resolve(outDir, 'sections-manifest.json')
}

function ledgerPath(outDir: string): string {
  return resolve(outDir, 'approved-section-rules.json')
}

function reviewsDir(outDir: string): string {
  return resolve(outDir, 'reviews')
}

function reviewJsonPath(outDir: string, sectionId: string): string {
  return resolve(reviewsDir(outDir), `${sectionId}-review.json`)
}

function reviewCsvPath(outDir: string, sectionId: string): string {
  return resolve(reviewsDir(outDir), `${sectionId}-review.csv`)
}

function readManifest(outDir: string): WorkflowManifest {
  return JSON.parse(readFileSync(manifestPath(outDir), 'utf8')) as WorkflowManifest
}

function initializeLedger(outDir: string, manifest: WorkflowManifest): ApprovedRulesLedger {
  const path = ledgerPath(outDir)
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf8')) as ApprovedRulesLedger
  }

  const ledger: ApprovedRulesLedger = {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pdfPath: manifest.pdfPath,
    templatePath: manifest.templatePath,
    approvedSections: [],
  }
  writeJsonFile(path, ledger)
  return ledger
}

function extractTemplateHeaders(templatePath: string | null): string[] {
  if (!templatePath || !existsSync(templatePath)) {
    return DEFAULT_HEADERS
  }
  const firstLine = readFileSync(templatePath, 'utf8').split(/\r?\n/, 1)[0] ?? ''
  const headers = firstLine.split(',').map((entry) => entry.trim()).filter(Boolean)
  return headers.length > 0 ? headers : DEFAULT_HEADERS
}

function sizeModifierFromRow(row: ProductTemplateRow): 'CANS' | 'GLASS' | null {
  const combined = normalizeUpper(`${row.pack_details} ${row.title}`)
  if (combined.includes('GLASS')) return 'GLASS'
  if (combined.includes('CANS') || combined.includes('CAN')) return 'CANS'
  return null
}

export function getRepoCompatibleSizeLabel(row: ProductTemplateRow): string | null {
  if (typeof row.size_value === 'number' && row.size_uom) {
    const base = `${formatSizeValue(row.size_value)} ${normalizeUpper(row.size_uom)}`
    const modifier = sizeModifierFromRow(row)
    return modifier ? `${base} ${modifier}` : base
  }

  const fallback = normalizePackDetails(row.pack_details)
  if (!fallback.sizeValue || !fallback.sizeUom) return null
  const base = `${formatSizeValue(fallback.sizeValue)} ${normalizeUpper(fallback.sizeUom)}`
  const modifier = sizeModifierFromRow(row)
  return modifier ? `${base} ${modifier}` : base
}

function writeSectionReviewArtifacts(outDir: string, section: SectionReview) {
  const reviewRows = section.proposedRows.map((row) => ({
    section_id: section.id,
    page_number: section.pageNumber,
    block: section.block,
    raw_section_header: section.rawSectionHeader,
    proposed_brand_name: section.proposedRule.brandName ?? '',
    proposed_header_pack_details: section.proposedRule.packDetails ?? '',
    row_mode: section.proposedRule.rowMode,
    source_line_number: row.source.lineNumber,
    source_description: row.source.description,
    source_price: row.source.price,
    proposed_title: row.output.title,
    proposed_pack_details: row.output.pack_details,
    proposed_pack_count: row.output.pack_count,
    proposed_size_value: row.output.size_value,
    proposed_size_uom: row.output.size_uom,
    flags: row.flags.join('|'),
    blocking_flags: row.blockingFlags.join('|'),
  }))

  writeJsonFile(reviewJsonPath(outDir, section.id), section)
  writeFileSync(
    reviewCsvPath(outDir, section.id),
    buildCsv(
      reviewRows,
      [
        'section_id',
        'page_number',
        'block',
        'raw_section_header',
        'proposed_brand_name',
        'proposed_header_pack_details',
        'row_mode',
        'source_line_number',
        'source_description',
        'source_price',
        'proposed_title',
        'proposed_pack_details',
        'proposed_pack_count',
        'proposed_size_value',
        'proposed_size_uom',
        'flags',
        'blocking_flags',
      ]
    ),
    'utf8'
  )
}

function runExtract(options: CliOptions) {
  if (!options.pdfPath) {
    throw new Error('extract requires --pdf <path>')
  }

  ensureDirectory(options.outDir)
  ensureDirectory(reviewsDir(options.outDir))

  const payload = extractPdfLayout(options.pdfPath, options.pythonCommand)
  const parsed = extractSectionsFromLayoutPages(payload.pages, options.splitColumn)
  const manifest: WorkflowManifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    pdfPath: options.pdfPath,
    templatePath: options.templatePath,
    splitColumn: options.splitColumn,
    sections: parsed.sections,
    exceptions: parsed.exceptions,
  }

  for (const section of parsed.sections) {
    writeSectionReviewArtifacts(options.outDir, section)
  }

  const indexRows = parsed.sections.map((section) => ({
    section_id: section.id,
    sequence: section.sequence,
    page_number: section.pageNumber,
    block: section.block,
    raw_section_header: section.rawSectionHeader,
    inherited_brand_name: section.inheritedContext.brandName ?? '',
    inherited_pack_details: section.inheritedContext.packDetails ?? '',
    proposed_brand_name: section.proposedRule.brandName ?? '',
    proposed_header_pack_details: section.proposedRule.packDetails ?? '',
    header_kind: section.proposedRule.headerKind,
    row_mode: section.proposedRule.rowMode,
    row_count: section.rawRows.length,
    issue_count: section.issues.length,
    blocking_issue_count: section.issues.filter((issue) => issue.severity === 'blocking').length,
    review_json: reviewJsonPath(options.outDir, section.id),
    review_csv: reviewCsvPath(options.outDir, section.id),
  }))

  writeFileSync(
    resolve(options.outDir, 'sections-index.csv'),
    buildCsv(indexRows, [
      'section_id',
      'sequence',
      'page_number',
      'block',
      'raw_section_header',
      'inherited_brand_name',
      'inherited_pack_details',
      'proposed_brand_name',
      'proposed_header_pack_details',
      'header_kind',
      'row_mode',
      'row_count',
      'issue_count',
      'blocking_issue_count',
      'review_json',
      'review_csv',
    ]),
    'utf8'
  )

  writeJsonFile(manifestPath(options.outDir), manifest)
  initializeLedger(options.outDir, manifest)

  console.log(`Extracted ${parsed.sections.length} sections to ${options.outDir}`)
  console.log(`Orphan priced rows: ${parsed.exceptions.length}`)
}

function runApprove(options: CliOptions) {
  if (!options.sectionId) {
    throw new Error('approve requires --section <id>')
  }

  const manifest = readManifest(options.outDir)
  const path = reviewJsonPath(options.outDir, options.sectionId)
  if (!existsSync(path)) {
    throw new Error(`Review artifact not found for section ${options.sectionId}`)
  }

  const rawSection = JSON.parse(readFileSync(path, 'utf8')) as SectionReview
  const section = applySectionOverrides(rawSection, {
    brandName: options.brandNameOverride,
    packDetails: options.packDetailsOverride,
  })
  const blockingIssues = section.issues.filter((issue) => issue.severity === 'blocking')
  if (blockingIssues.length > 0 && !options.force) {
    throw new Error(
      `Section ${options.sectionId} has blocking issues. Re-run with --force after review if approval is intentional.`
    )
  }

  const ledger = initializeLedger(options.outDir, manifest)
  const approvedSection: ApprovedSection = {
    sectionId: section.id,
    approvedAt: new Date().toISOString(),
    rawSectionHeader: section.rawSectionHeader,
    pageNumber: section.pageNumber,
    block: section.block,
    proposedRule: section.proposedRule,
    issues: section.issues,
    rows: section.proposedRows.map((row) => ({
      ...row,
      output: applyApprovalCleanup(row.output),
    })),
  }

  const nextApprovedSections = ledger.approvedSections.filter(
    (entry) => entry.sectionId !== approvedSection.sectionId
  )
  nextApprovedSections.push(approvedSection)
  nextApprovedSections.sort((left, right) => {
    const leftOrder =
      manifest.sections.find((sectionItem) => sectionItem.id === left.sectionId)?.sequence ?? Number.MAX_SAFE_INTEGER
    const rightOrder =
      manifest.sections.find((sectionItem) => sectionItem.id === right.sectionId)?.sequence ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
  })

  const nextLedger: ApprovedRulesLedger = {
    ...ledger,
    updatedAt: new Date().toISOString(),
    approvedSections: nextApprovedSections,
  }

  writeJsonFile(ledgerPath(options.outDir), nextLedger)
  console.log(`Approved ${section.id}`)
}

function collectExceptionRows(manifest: WorkflowManifest, ledger: ApprovedRulesLedger): ExceptionRow[] {
  const approvedIds = new Set(ledger.approvedSections.map((section) => section.sectionId))
  const exceptionRows = [...manifest.exceptions]

  for (const section of manifest.sections) {
    if (approvedIds.has(section.id)) continue
    for (const row of section.rawRows) {
      exceptionRows.push({
        sectionId: section.id,
        page_number: row.pageNumber,
        block: row.block,
        raw_section_header: section.rawSectionHeader,
        line_number: row.lineNumber,
        description: row.description,
        price_raw: row.priceRaw,
        reason: 'section_not_approved',
      })
    }
  }

  return exceptionRows
}

function runBuild(options: CliOptions) {
  const manifest = readManifest(options.outDir)
  const ledger = initializeLedger(options.outDir, manifest)
  const headers = extractTemplateHeaders(options.templatePath ?? manifest.templatePath)
  const approvedRows = ledger.approvedSections.flatMap((section) => section.rows.map((row) => row.output))

  writeFileSync(resolve(options.outDir, 'staging-products.csv'), buildCsv(approvedRows, headers), 'utf8')

  const brandCounts = new Map<string, number>()
  for (const row of approvedRows) {
    const key = normalizeDisplayText(row.brand_name)
    if (!key) continue
    brandCounts.set(key, (brandCounts.get(key) ?? 0) + 1)
  }

  const sizeCounts = new Map<string, number>()
  for (const row of approvedRows) {
    const sizeLabel = getRepoCompatibleSizeLabel(row)
    if (!sizeLabel) continue
    sizeCounts.set(sizeLabel, (sizeCounts.get(sizeLabel) ?? 0) + 1)
  }

  writeFileSync(
    resolve(options.outDir, 'brands.csv'),
    buildCsv(
      [...brandCounts.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([brand_name, product_count]) => ({ brand_name, product_count })),
      ['brand_name', 'product_count']
    ),
    'utf8'
  )

  writeFileSync(
    resolve(options.outDir, 'sizes.csv'),
    buildCsv(
      [...sizeCounts.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([size_label, product_count]) => ({ size_label, product_count })),
      ['size_label', 'product_count']
    ),
    'utf8'
  )

  const exceptionRows = collectExceptionRows(manifest, ledger)
  writeFileSync(
    resolve(options.outDir, 'exceptions.csv'),
    buildCsv(exceptionRows, [
      'sectionId',
      'page_number',
      'block',
      'raw_section_header',
      'line_number',
      'description',
      'price_raw',
      'reason',
    ]),
    'utf8'
  )

  console.log(`Built ${approvedRows.length} staging product rows`)
  console.log(`Approved sections: ${ledger.approvedSections.length}`)
  console.log(`Exception rows: ${exceptionRows.length}`)
}

export function runSectionGatedPdfImport(argv: string[] = process.argv.slice(2)) {
  const options = parseArgs(argv)

  if (options.command === 'extract') {
    runExtract(options)
    return
  }
  if (options.command === 'approve') {
    runApprove(options)
    return
  }
  runBuild(options)
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  try {
    runSectionGatedPdfImport()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Section-gated import failed: ${message}`)
    process.exit(1)
  }
}
