import { HomepageWelcome } from '@/components/portal/homepage-welcome'
import { HomepageStartSection, type DraftForStrip } from '@/components/portal/homepage-start-section'
import { AnnouncementsStack } from '@/components/portal/announcements-stack'
import { getHydratedMockAnnouncements } from '@/lib/mock/announcements'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { todayISODate } from '@/lib/utils'

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

  const announcements = await getHydratedMockAnnouncements(db)

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
        {/* TODO: replace with real announcements query */}
        <AnnouncementsStack
          announcements={announcements}
          token={token}
          primaryDraftOrderId={drafts[0]?.id ?? null}
          showPrices={profile.show_prices}
        />
      </section>
    </div>
  )
}
