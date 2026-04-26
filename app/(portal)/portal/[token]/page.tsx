import { HomepageWelcome } from '@/components/portal/homepage-welcome'
import { HomepageStartSection, type DraftForStrip } from '@/components/portal/homepage-start-section'
import { AnnouncementsStack } from '@/components/portal/announcements-stack'
import {
  fetchHomepageAnnouncements,
  fetchInlineAnnouncementProducts,
  pickResolvedProducts,
} from '@/lib/server/announcements'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { todayISODate } from '@/lib/utils'
import type { CatalogProduct } from '@/lib/types'

export default async function PortalHome({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { customerId, profile } = await resolveCustomerToken(token)
  const db = await getRequestDb()
  const today = todayISODate()

  // Drafts only — order history moved to /portal/[token]/orders.
  const draftsResult = await db.query<{
    id: string
    delivery_date: string
    item_count: number | null
  }>(
    `select id, delivery_date::text, item_count
     from orders
     where customer_id = $1
       and status = 'draft'
       and delivery_date >= $2
     order by delivery_date asc
     limit 10`,
    [customerId, today],
  )

  const drafts: DraftForStrip[] = draftsResult.rows.map((row) => ({
    id: row.id,
    deliveryDate: row.delivery_date,
    itemCount: row.item_count ?? 0,
  }))

  const announcements = await fetchHomepageAnnouncements(
    db,
    customerId,
    profile.tags ?? [],
  )

  // Resolve products for inline cards (spotlight + specials_grid). Editorial
  // cards don't need this — their CTAs route to <PromoSheet> which resolves
  // on the client.
  const productMap = await fetchInlineAnnouncementProducts(
    db,
    announcements,
    customerId,
  )
  const resolvedProductsByAnnouncement: Record<
    string,
    { product: CatalogProduct | null; products: CatalogProduct[] }
  > = {}
  for (const a of announcements) {
    resolvedProductsByAnnouncement[a.id] = pickResolvedProducts(a, productMap)
  }

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-8">
      <section className="space-y-6 pt-2">
        <HomepageWelcome
          contactName={profile.contact_name}
          businessName={profile.business_name}
        />

        <HomepageStartSection token={token} drafts={drafts} />
      </section>

      <section className="space-y-3 rounded-2xl border border-foreground/5 bg-muted/30 px-4 py-6 md:px-6 md:py-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          For you
        </h2>
        <AnnouncementsStack
          announcements={announcements}
          token={token}
          primaryDraftOrderId={drafts[0]?.id ?? null}
          showPrices={profile.show_prices}
          resolvedProductsByAnnouncement={resolvedProductsByAnnouncement}
        />
      </section>
    </div>
  )
}
