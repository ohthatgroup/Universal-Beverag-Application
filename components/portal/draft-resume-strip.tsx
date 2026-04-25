import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import { formatDeliveryDate } from '@/lib/utils'

interface DraftResumeStripProps {
  token: string
  drafts: Array<{
    orderId: string
    deliveryDate: string
    itemCount: number
  }>
}

export function DraftResumeStrip({ token, drafts }: DraftResumeStripProps) {
  if (drafts.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Resume a draft</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {drafts.map((draft) => {
          const href = buildCustomerOrderDeepLink(token, draft.orderId) ?? '#'
          return (
            <Link
              key={draft.orderId}
              href={href}
              className="group flex min-w-[220px] shrink-0 items-center gap-3 rounded-xl border bg-status-draft-bg px-3 py-2 transition-colors hover:border-primary/40 sm:min-w-0"
            >
              <OrderStatusDot status="draft" />
              <div className="flex-1 text-sm">
                <div className="font-medium">{formatDeliveryDate(draft.deliveryDate)}</div>
                <div className="text-xs text-muted-foreground">{draft.itemCount} items</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
