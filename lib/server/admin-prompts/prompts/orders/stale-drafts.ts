import type { Prompt, Subject } from '../../types'
import type { DbFacade } from '@/lib/server/db'

/** Drafts untouched for 7+ days. Folds N. Drawer:
 *  `bulk-close-or-nudge` — salesman can either nudge the customer to
 *  finish the cart or close the draft. */
export async function staleDraftsPrompt(
  db: DbFacade,
): Promise<Prompt | null> {
  const { rows } = await db.query<{
    id: string
    business_name: string | null
    contact_name: string | null
    delivery_date: string
    item_count: number | null
    days: number
  }>(
    `select o.id,
            p.business_name,
            p.contact_name,
            o.delivery_date::text,
            o.item_count,
            extract(day from now() - o.updated_at)::int as days
       from orders o
       left join profiles p on p.id = o.customer_id
      where o.status = 'draft'
        and o.updated_at < now() - interval '7 days'
      order by o.updated_at asc
      limit 50`,
  )
  if (rows.length === 0) return null

  const subjects: Subject[] = rows.map((row) => ({
    id: row.id,
    label:
      row.business_name ??
      row.contact_name ??
      `Draft for ${row.delivery_date}`,
    sublabel: `${row.item_count ?? 0} items · ${row.days} days untouched`,
  }))
  const count = subjects.length
  return {
    id: 'hygiene/stale-drafts',
    category: 'hygiene',
    kind: 'stale-drafts',
    severity: 'warn',
    title:
      count === 1
        ? `1 stale draft (7+ days untouched)`
        : `${count} stale drafts (7+ days untouched)`,
    body: 'Nudge the customer to submit, or close the draft.',
    subjects,
    count,
    cta: count === 1 ? 'Review' : `Review ${count}`,
    action: { kind: 'drawer', drawerKind: 'stale-drafts' },
  }
}
