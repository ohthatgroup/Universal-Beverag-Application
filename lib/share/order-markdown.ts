import { formatCurrency, formatDeliveryDate } from '@/lib/utils'

export interface OrderMarkdownItem {
  label: string
  pack: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface OrderMarkdownInput {
  orderId: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  deliveryDate: string
  status: 'draft' | 'submitted' | 'delivered'
  submittedAt: string | null
  total: number
  itemCount: number
  items: OrderMarkdownItem[]
}

export function buildOrderMarkdown(order: OrderMarkdownInput): string {
  const lines: string[] = []

  lines.push(`# Order for ${order.customerName}`)
  lines.push('')
  lines.push(`- **Delivery date:** ${formatDeliveryDate(order.deliveryDate)}`)
  lines.push(`- **Status:** ${capitalize(order.status)}`)
  if (order.submittedAt) {
    lines.push(`- **Submitted:** ${formatTimestamp(order.submittedAt)}`)
  }
  if (order.customerEmail) {
    lines.push(`- **Email:** ${order.customerEmail}`)
  }
  if (order.customerPhone) {
    lines.push(`- **Phone:** ${order.customerPhone}`)
  }
  lines.push(`- **Order ID:** ${order.orderId}`)
  lines.push('')

  lines.push(`## Items (${order.itemCount})`)
  lines.push('')

  if (order.items.length === 0) {
    lines.push('_No line items._')
  } else {
    lines.push('| Qty | Product | Unit | Total |')
    lines.push('| --- | --- | ---: | ---: |')
    for (const item of order.items) {
      const label = item.pack ? `${item.label} — ${item.pack}` : item.label
      lines.push(
        `| ${item.quantity} | ${escapeCell(label)} | ${formatCurrency(item.unitPrice)} | ${formatCurrency(item.lineTotal)} |`
      )
    }
  }

  lines.push('')
  lines.push(`**Total: ${formatCurrency(order.total)}**`)
  lines.push('')

  return lines.join('\n')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}
