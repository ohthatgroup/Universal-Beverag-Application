import type { Prompt, Subject } from '../../types'
import type { DbFacade } from '@/lib/server/db'

/** Active deals expiring in the next 7 days. Folds N. Drawer:
 *  `bulk-extend-deals` — pick days to extend each row. */
export async function expiringDealsPrompt(
  db: DbFacade,
): Promise<Prompt | null> {
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
  // Severity escalates if any subject expires within 1 day.
  const severity = rows.some((row) => row.days <= 1) ? 'warn' : 'info'

  return {
    id: 'urgent/expiring-deals',
    category: 'urgent',
    kind: 'expiring-deals',
    severity,
    title:
      count === 1
        ? `1 deal expires this week`
        : `${count} deals expire this week`,
    body: 'Extend, edit copy, or let them lapse.',
    subjects,
    count,
    cta: count === 1 ? 'Extend' : `Extend ${count}`,
    action: { kind: 'drawer', drawerKind: 'bulk-extend-deals' },
  }
}
