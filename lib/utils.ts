import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { OrderStatus } from '@/lib/types'

// shadcn's cn() — merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Currency ─────────────────────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  options: { compact?: boolean } = {}
): string {
  if (options.compact && amount >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const PACK_UOM_OPTIONS = [
  'OZ',
  'ML',
  'LITER',
  'LITERS',
  'GALLON',
  'GALLONS',
  'CT',
  'ROLL',
  'ROLLS',
] as const

export type PackUom = (typeof PACK_UOM_OPTIONS)[number]

interface ProductPackFields {
  pack_count?: number | null
  size_value?: number | null
  size_uom?: string | null
  pack_details?: string | null
  title?: string | null
}

export function normalizePackUom(value: string): string {
  return value.trim().toUpperCase()
}

export function isSupportedPackUom(value: string): value is PackUom {
  return (PACK_UOM_OPTIONS as readonly string[]).includes(normalizePackUom(value))
}

export function formatSizeValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value)
}

export function formatStructuredPack(packCount: number, sizeValue: number, sizeUom: string): string {
  return `${packCount}/${formatSizeValue(sizeValue)} ${normalizePackUom(sizeUom)}`
}

export function formatStructuredSize(sizeValue: number, sizeUom: string): string {
  return `${formatSizeValue(sizeValue)} ${normalizePackUom(sizeUom)}`
}

function parseSizeFromPackDetails(packDetails: string): { sizeValue: number; sizeUom: PackUom } | null {
  const src = packDetails.trim().toUpperCase()
  if (!src) return null

  const match = src.match(
    /^\s*\d+\s*\/\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\.|-|\s)?\s*(OZ|ML|LITER|LITERS|GALLON|GALLONS|CT|ROLLS?|ROLL)\b/i
  )
  if (!match) return null

  const sizeValue = Number(match[1])
  const rawUom = normalizePackUom(match[2]).replace(/\.$/, '')
  if (!Number.isFinite(sizeValue) || sizeValue <= 0 || !isSupportedPackUom(rawUom)) {
    return null
  }

  return { sizeValue, sizeUom: rawUom }
}

function getAcceptedSizeModifier(value: string | null | undefined): 'CANS' | 'GLASS' | null {
  const src = (value ?? '').toUpperCase()
  if (!src) return null
  if (/\bGLASS\b/.test(src)) return 'GLASS'
  if (/\bCANS?\b/.test(src)) return 'CANS'
  return null
}

export function getProductPackLabel(product: ProductPackFields): string | null {
  if (
    typeof product.pack_count === 'number' &&
    typeof product.size_value === 'number' &&
    typeof product.size_uom === 'string' &&
    product.size_uom.trim().length > 0
  ) {
    return formatStructuredPack(product.pack_count, product.size_value, product.size_uom)
  }

  const fallback = product.pack_details?.trim()
  return fallback && fallback.length > 0 ? fallback : null
}

export function getProductSizeLabel(product: ProductPackFields): string | null {
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

export function getProductDisplayName(product: ProductPackFields, brandName?: string | null): string {
  const brand = (brandName ?? '').trim()
  const flavorDetails = (product.title ?? '').trim()
  const size = getProductSizeLabel(product)

  const parts: string[] = []
  if (brand) parts.push(brand)
  if (flavorDetails) parts.push(flavorDetails)
  if (size) parts.push(size)

  if (parts.length > 0) {
    return parts.join(' - ')
  }

  return 'Unknown Product'
}

// ─── Dates ────────────────────────────────────────────────────────────────

// Format ISO date string (YYYY-MM-DD) for display: "Feb 20, 2025"
export function formatDeliveryDate(isoDate: string): string {
  // Parse as local date to avoid UTC timezone shift
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Get today's ISO date string in local time (not UTC)
export function todayISODate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Advance a date by N days, returning ISO string
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── CSV Export ───────────────────────────────────────────────────────────

export interface CsvRow {
  [key: string]: string | number | boolean | null | undefined
}

// Build a CSV string from an array of objects
export function buildCsv(rows: CsvRow[], headers: string[]): string {
  const escape = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headerRow = headers.map(escape).join(',')
  const dataRows = rows.map((row) =>
    headers.map((h) => escape(row[h])).join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

// Build order-specific CSV rows for download
export function buildOrderCsvRows(
  items: Array<{
    product_title: string
    pack_details: string | null
    quantity: number
    unit_price: number
    line_total: number
  }>
): { rows: CsvRow[]; headers: string[] } {
  const headers = ['Product', 'Pack Details', 'Quantity', 'Unit Price', 'Line Total']
  const rows: CsvRow[] = items.map((item) => ({
    Product: item.product_title,
    'Pack Details': item.pack_details ?? '',
    Quantity: item.quantity,
    'Unit Price': item.unit_price.toFixed(2),
    'Line Total': item.line_total.toFixed(2),
  }))
  return { rows, headers }
}

// ─── Order status helpers ─────────────────────────────────────────────────

export function getStatusLabel(status: OrderStatus): string {
  return {
    draft: 'Draft',
    submitted: 'Submitted',
    delivered: 'Delivered',
  }[status]
}

export type StatusBadgeVariant = 'draft' | 'submitted' | 'delivered' | 'cancelled'

export function getStatusVariant(status: OrderStatus): StatusBadgeVariant {
  return {
    draft: 'draft',
    submitted: 'submitted',
    delivered: 'delivered',
  }[status] as StatusBadgeVariant
}

// ─── Debounce ─────────────────────────────────────────────────────────────

export function getStatusIcon(status: OrderStatus): string {
  return {
    draft: '○',
    submitted: '●',
    delivered: '✓',
  }[status]
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
