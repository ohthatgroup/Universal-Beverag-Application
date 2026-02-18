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

export function getStatusVariant(
  status: OrderStatus
): 'default' | 'secondary' | 'outline' | 'success' {
  return {
    draft: 'outline',
    submitted: 'default',
    delivered: 'success',
  }[status] as 'default' | 'secondary' | 'outline' | 'success'
}

export function getStatusIcon(status: OrderStatus): string {
  return {
    draft: '○',
    submitted: '●',
    delivered: '✓',
  }[status]
}

// ─── Debounce ─────────────────────────────────────────────────────────────

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
