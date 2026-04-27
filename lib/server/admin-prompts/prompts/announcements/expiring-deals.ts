import type { Moment, Subject } from '../../types'
import type { DbFacade } from '@/lib/server/db'
import { foldedWeight } from '../../weight'

/** Active deals expiring in the next 7 days. Folds N. Drawer:
 *  `bulk-extend-deals` — pick days to extend each row. */
export async function expiringDealsPrompt(
  db: DbFacade,
): Promise<Moment | null> {
  const { rows } = await db.query<{
    id: string
    title: string | null
    days: number
  }>(
    `select id,
            title,
            (ends_at - current_date)::int as days
       from announcements
      where kind = 'deal'
        and is_active
        and ends_at is not null
        and ends_at >= current_date
        and ends_at <= current_date + 7
      order by ends_at asc
      limit 50`,
  )
  if (rows.length === 0) return null

  const subjects: Subject[] = rows.map((row) => {
    const dayLabel =
      row.days === 0
        ? 'expires today'
        : row.days === 1
          ? 'expires tomorrow'
          : `expires in ${row.days} days`
    return {
      id: row.id,
      label: row.title ?? 'Untitled deal',
      sublabel: dayLabel,
    }
  })
  const count = subjects.length
  const weight = foldedWeight(0.95, count)

  return {
    id: 'just-in/expiring-deals',
    category: 'just-in',
    kind: 'expiring-deals',
    narrative:
      count === 1
        ? "1 deal is about to expire."
        : `${count} deals are about to expire.`,
    when: 'this week',
    subjects,
    primary: {
      label: 'Extend or let them lapse',
      action: { kind: 'drawer', drawerKind: 'bulk-extend-deals' },
    },
    secondary: [],
    weight,
  }
}
