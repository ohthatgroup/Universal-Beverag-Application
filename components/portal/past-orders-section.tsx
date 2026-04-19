import { ChevronDown } from 'lucide-react'
import type { Order } from '@/lib/types'
import { OrdersList } from '@/components/orders/orders-list'

interface PastOrdersSectionProps {
  token: string
  orders: Order[]
  showPrices: boolean
}

export function PastOrdersSection({ token, orders, showPrices }: PastOrdersSectionProps) {
  if (orders.length === 0) return null

  const defaultOpen = orders.length <= 3

  return (
    <details open={defaultOpen} className="group space-y-2">
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground [&::-webkit-details-marker]:hidden">
        <span>Past orders ({orders.length})</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pt-2">
        <OrdersList token={token} orders={orders} variant="past" showPrices={showPrices} />
      </div>
    </details>
  )
}
