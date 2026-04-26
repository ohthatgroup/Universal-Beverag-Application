import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import { formatDeliveryDate } from '@/lib/utils'

export interface DraftForStrip {
  id: string
  deliveryDate: string
  itemCount: number
}

interface HomepageDraftStripProps {
  token: string
  drafts: DraftForStrip[]
}

/**
 * Slim resume strip on the homepage. Renders the primary draft (soonest
 * delivery date) as an accent block, then any additional drafts as quiet
 * rows under a small "Other drafts" subheading.
 *
 * Returns null when there are no drafts. New-order entry points all live
 * in the navbar's Start order drawer.
 */
export function HomepageDraftStrip({
  token,
  drafts,
}: HomepageDraftStripProps) {
  if (drafts.length === 0) return null

  // Drafts are pre-sorted by delivery_date asc (soonest first).
  const [primary, ...others] = drafts
  const primaryHref = buildCustomerOrderDeepLink(token, primary.id) ?? '#'

  return (
    <section className="space-y-3">
      <Link
        href={primaryHref}
        className="group flex items-center gap-3 rounded-2xl bg-accent px-5 py-4 text-accent-foreground shadow-sm transition-colors hover:bg-accent/90"
      >
        <OrderStatusDot status="draft" className="bg-accent-foreground/30" />
        <div className="flex-1 text-sm">
          <div className="font-semibold">
            Resume draft for {formatDeliveryDate(primary.deliveryDate)}
          </div>
          <div className="text-xs text-accent-foreground/80">
            {primary.itemCount}{' '}
            {primary.itemCount === 1 ? 'item' : 'items'}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>

      {others.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Other drafts
          </h3>
          <ul className="space-y-1.5">
            {others.map((draft) => {
              const href = buildCustomerOrderDeepLink(token, draft.id) ?? '#'
              return (
                <li key={draft.id}>
                  <Link
                    href={href}
                    className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <OrderStatusDot status="draft" className="shrink-0" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-sm font-medium">
                        Draft for {formatDeliveryDate(draft.deliveryDate)}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {draft.itemCount}{' '}
                        {draft.itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
