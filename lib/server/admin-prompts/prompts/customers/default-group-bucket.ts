import type { Prompt, Subject } from '../../types'
import { resolveDefaultGroupId } from '@/lib/server/default-group'
import type { DbFacade } from '@/lib/server/db'

/** Customers sitting in the seeded "Default" group. Folds N. The
 *  evergreen `bulk-assign-group` drawer reads `prompt.subjects` to
 *  pre-check rows and sends `{ ids, customerGroupId }` to
 *  `/api/admin/customers/bulk-assign-group`. */
export async function defaultGroupBucketPrompt(
  db: DbFacade,
): Promise<Prompt | null> {
  const defaultId = await resolveDefaultGroupId()
  const { rows } = await db.query<{
    id: string
    business_name: string | null
    contact_name: string | null
    days_since_last: number | null
  }>(
    `select p.id,
            p.business_name,
            p.contact_name,
            (extract(day from now() - max(o.delivery_date)))::int as days_since_last
       from profiles p
       left join orders o
         on o.customer_id = p.id
        and o.status in ('submitted','delivered')
      where p.role = 'customer'
        and p.customer_group_id = $1
      group by p.id
      order by p.business_name asc nulls last, p.contact_name asc nulls last
      limit 50`,
    [defaultId],
  )
  if (rows.length === 0) return null

  const subjects: Subject[] = rows.map((row) => ({
    id: row.id,
    label: row.business_name ?? row.contact_name ?? 'Unnamed customer',
    sublabel:
      row.days_since_last == null
        ? 'No orders yet'
        : `${row.days_since_last} days since last order`,
  }))

  const count = subjects.length
  return {
    id: 'opportunity/default-group-bucket',
    category: 'opportunity',
    kind: 'default-group-bucket',
    severity: 'info',
    title:
      count === 1
        ? `1 customer in the Default group`
        : `${count} customers in the Default group`,
    body: 'Assign them to a more specific group to enable targeted deals.',
    subjects,
    count,
    cta: count === 1 ? 'Assign' : `Assign ${count}`,
    action: { kind: 'drawer', drawerKind: 'bulk-assign-group' },
  }
}
