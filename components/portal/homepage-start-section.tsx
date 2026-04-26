'use client'

import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { useStartOrderDrawer } from '@/components/portal/start-order-drawer-context'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import { formatDeliveryDate } from '@/lib/utils'

export interface DraftForStrip {
  id: string
  deliveryDate: string
  itemCount: number
}

interface HomepageStartSectionProps {
  token: string
  drafts: DraftForStrip[]
}

/**
 * Above-the-fold start-order section on the homepage. Three shapes:
 *
 * 1. No drafts → big "Start an order" accent button (the figure).
 * 2. One draft → Resume block + small "Or start a new order" link.
 * 3. Multiple drafts → primary draft + Other drafts list +
 *    "Or start a new order" link.
 *
 * All start-new actions open the layout-owned <StartOrderDrawer> via
 * the context's `open()`.
 */
export function HomepageStartSection({
  token,
  drafts,
}: HomepageStartSectionProps) {
  const drawer = useStartOrderDrawer()

  if (drafts.length === 0) {
    return (
      <section>
        <Button
          type="button"
          variant="accent"
          size="lg"
          onClick={drawer.open}
          className="h-14 w-full justify-between gap-3 rounded-2xl px-5 text-base font-semibold sm:w-auto sm:justify-start"
        >
          <span className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5" />
            Start an order
          </span>
          <ArrowRight className="h-5 w-5 sm:ml-3" />
        </Button>
      </section>
    )
  }

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

      <button
        type="button"
        onClick={drawer.open}
        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        Or start a new order →
      </button>
    </section>
  )
}
