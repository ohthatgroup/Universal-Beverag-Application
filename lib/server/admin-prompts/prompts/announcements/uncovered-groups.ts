import type { Prompt, Subject } from '../../types'
import { resolveDefaultGroupId } from '@/lib/server/default-group'
import type { DbFacade } from '@/lib/server/db'

/** Customer groups (excluding Default) that no active deal targets,
 *  given there's no active broadcast deal either. Folds N. Drawer:
 *  `pin-deal-for-groups` lets the salesman create one deal pinned to
 *  the selected groups in one go. */
export async function uncoveredGroupsPrompt(
  db: DbFacade,
): Promise<Prompt | null> {
  const defaultId = await resolveDefaultGroupId()
  const { rows } = await db.query<{
    id: string
    name: string
    member_count: number
  }>(
    `select g.id,
            g.name,
            (
              select count(*)::int
                from profiles p
               where p.customer_group_id = g.id and p.role = 'customer'
            ) as member_count
       from customer_groups g
      where g.id <> $1
        and not exists (
          select 1
            from announcements a
           where a.is_active
             and a.kind = 'deal'
             and (
               a.target_group_ids = '{}'::uuid[]
               or g.id = any(a.target_group_ids)
             )
        )
      order by g.sort_order asc, lower(g.name) asc
      limit 50`,
    [defaultId],
  )
  if (rows.length === 0) return null

  const subjects: Subject[] = rows.map((row) => ({
    id: row.id,
    label: row.name,
    sublabel: `${row.member_count} ${row.member_count === 1 ? 'customer' : 'customers'}`,
  }))
  const count = subjects.length
  return {
    id: 'opportunity/uncovered-groups',
    category: 'opportunity',
    kind: 'uncovered-groups',
    severity: 'info',
    title:
      count === 1
        ? `1 group has no deal targeting it`
        : `${count} groups have no deals targeting them`,
    body: 'Pin a deal to keep these segments engaged.',
    subjects,
    count,
    cta: count === 1 ? 'Pin a deal' : `Pin a deal for ${count}`,
    action: { kind: 'drawer', drawerKind: 'pin-deal-for-groups' },
  }
}
