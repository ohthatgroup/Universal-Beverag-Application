import type { Moment, Subject } from '../../types'
import type { DbFacade } from '@/lib/server/db'
import { foldedWeight } from '../../weight'

/** Drafts untouched for 7+ days. Folds N. Drawer:
 *  `stale-drafts` — salesman can either nudge the customer to
 *  finish the cart or close the draft. */
export async function staleDraftsPrompt(
  db: DbFacade,
): Promise<Moment | null> {
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
  const weight = foldedWeight(0.4, count)

  return {
    id: 'worth-a-look/stale-drafts',
    category: 'worth-a-look',
    kind: 'stale-drafts',
    narrative:
      count === 1
        ? "1 draft has been sitting untouched for over a week."
        : `${count} drafts have been sitting untouched for over a week.`,
    when: 'order cleanup',
    subjects,
    primary: {
      label: 'Nudge or close them',
      action: { kind: 'drawer', drawerKind: 'stale-drafts' },
    },
    secondary: [],
    weight,
  }
}
