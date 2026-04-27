import type { Moment, Subject } from '../../types'
import type { DbFacade } from '@/lib/server/db'
import { foldedWeight } from '../../weight'

interface Options {
  /** Subject ids to skip (e.g. `high-value-at-risk`'s subject). */
  excludeIds?: string[]
}

/** Customers with their most-recent submitted/delivered order older
 *  than 21 days. Folds N. Drawer: `outreach`. */
export async function staleCustomersPrompt(
  db: DbFacade,
  options: Options = {},
): Promise<Moment | null> {
  const exclude = options.excludeIds ?? []
  const { rows } = await db.query<{
    id: string
    business_name: string | null
    contact_name: string | null
    days: number
  }>(
    `select p.id,
            p.business_name,
            p.contact_name,
            extract(day from now() - max(o.delivery_date))::int as days
       from profiles p
       join orders o on o.customer_id = p.id
      where p.role = 'customer'
        and o.status in ('submitted', 'delivered')
        and ($1::uuid[] = '{}' or p.id <> all($1::uuid[]))
      group by p.id
     having max(o.delivery_date) < now() - interval '21 days'
      order by max(o.delivery_date) asc
      limit 50`,
    [exclude],
  )
  if (rows.length === 0) return null

  const subjects: Subject[] = rows.map((row) => ({
    id: row.id,
    label: row.business_name ?? row.contact_name ?? 'Unnamed customer',
    sublabel: `${row.days} days since last order`,
  }))
  const count = subjects.length
  const weight = foldedWeight(0.7, count)

  return {
    id: 'just-in/stale-customers',
    category: 'just-in',
    kind: 'stale-customers',
    narrative:
      count === 1
        ? "1 customer hasn't ordered in a while."
        : `${count} customers haven't ordered in a while.`,
    when: 'this week',
    subjects,
    primary: {
      label: 'Reach out',
      action: {
        kind: 'drawer',
        drawerKind: 'outreach',
        payload: { templateKind: 'stale-customers' },
      },
    },
    secondary: [
      {
        label: 'Pin a one-off deal for them',
        action: { kind: 'href', href: '/admin/announcements' },
      },
    ],
    weight,
  }
}
