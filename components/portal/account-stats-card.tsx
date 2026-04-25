import { Money } from '@/components/ui/money'

interface AccountStatsCardProps {
  casesThisMonth: number
  spendThisMonth: number
  ordersThisMonth: number
}

export function AccountStatsCard({
  casesThisMonth,
  spendThisMonth,
  ordersThisMonth,
}: AccountStatsCardProps) {
  if (casesThisMonth === 0 && spendThisMonth === 0 && ordersThisMonth === 0) {
    return null
  }

  const monthLabel = new Date().toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto w-full max-w-[600px] rounded-xl bg-muted/50 px-4 py-4">
      <p className="text-sm font-medium text-muted-foreground">
        Your account · {monthLabel}
      </p>
      <ul className="mt-2 space-y-1 text-sm tabular-nums">
        <li>
          {casesThisMonth} {casesThisMonth === 1 ? 'case' : 'cases'} ordered
        </li>
        <li>
          <Money value={spendThisMonth} className="font-normal" /> total spend
        </li>
        <li>
          {ordersThisMonth} {ordersThisMonth === 1 ? 'order' : 'orders'} placed
        </li>
      </ul>
    </div>
  )
}
