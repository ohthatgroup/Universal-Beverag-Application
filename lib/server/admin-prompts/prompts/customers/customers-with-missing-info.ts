import type { Prompt, Subject } from '../../types'
import type { DbFacade } from '@/lib/server/db'

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
): Promise<Prompt | null> {
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

  return {
    id: 'hygiene/customers-with-missing-info',
    category: 'hygiene',
    kind: 'customers-with-missing-info',
    severity: 'info',
    title:
      subjects.length === 1
        ? `1 customer needs missing info`
        : `${subjects.length} customers need missing info`,
    body: 'Click a row to fill what’s missing on their edit page.',
    subjects,
    count: subjects.length,
    cta: 'Review',
    action: { kind: 'drawer', drawerKind: 'customers-missing-info' },
  }
}
