import type { Moment, Subject } from '../../types'
import type { DbFacade } from '@/lib/server/db'
import { foldedWeight } from '../../weight'

interface Row {
  id: string
  business_name: string | null
  contact_name: string | null
  has_phone: boolean
  has_token: boolean
}

/**
 * Combined hygiene audit for customers. Fires when any non-staff
 * profile is missing one or more of:
 *   - `contact_name`
 *   - `phone` (so the salesman has a non-email channel)
 *   - `access_token` (no portal link)
 *
 * Drawer: directory, no batch action. Each row links to the
 * customer's edit page with the first missing field auto-focused.
 */
export async function customersWithMissingInfoPrompt(
  db: DbFacade,
): Promise<Moment | null> {
  const { rows } = await db.query<Row>(
    `select id,
            business_name,
            contact_name,
            phone is not null and phone <> '' as has_phone,
            access_token is not null as has_token
       from profiles
      where role = 'customer'
        and (
              contact_name is null or contact_name = ''
           or phone is null or phone = ''
           or access_token is null
        )
      order by business_name asc nulls last, contact_name asc nulls last
      limit 50`,
  )
  if (rows.length === 0) return null

  const subjects: Subject[] = rows.map((row) => {
    const missing: string[] = []
    if (!row.contact_name) missing.push('contact')
    if (!row.has_phone) missing.push('phone')
    if (!row.has_token) missing.push('portal link')
    return {
      id: row.id,
      label: row.business_name ?? row.contact_name ?? 'Unnamed customer',
      sublabel: missing.length > 0 ? `missing ${missing.join(', ')}` : undefined,
    }
  })

  const count = subjects.length
  const weight = foldedWeight(0.4, count)

  return {
    id: 'worth-a-look/customers-with-missing-info',
    category: 'worth-a-look',
    kind: 'customers-with-missing-info',
    narrative:
      count === 1
        ? "1 customer's profile is missing details."
        : `${count} customers are missing some details.`,
    when: 'profile cleanup',
    subjects,
    primary: {
      label: "Fill in what's missing",
      action: { kind: 'drawer', drawerKind: 'customers-missing-info' },
    },
    secondary: [],
    weight,
  }
}
