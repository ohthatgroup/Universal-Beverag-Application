import {
  CustomerGroupsManager,
  type CustomerGroupRow,
} from '@/components/admin/customer-groups-manager'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function CustomerGroupsPage() {
  await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const { rows } = await db.query<{
    id: string
    name: string
    description: string | null
    sort_order: number
    member_count: number
  }>(
    `select g.id, g.name, g.description, g.sort_order,
            (
              select count(*)::int from profiles p
              where p.customer_group_id = g.id and p.role = 'customer'
            ) as member_count
       from customer_groups g
      order by g.sort_order asc, lower(g.name) asc`,
  )

  const groups: CustomerGroupRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    memberCount: Number(row.member_count ?? 0),
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer Groups"
        description={
          groups.length === 0
            ? 'Group customers to share deal ordering + visibility.'
            : `${groups.length} group${groups.length === 1 ? '' : 's'} · ` +
              `${groups.reduce((s, g) => s + g.memberCount, 0)} customer${
                groups.reduce((s, g) => s + g.memberCount, 0) === 1 ? '' : 's'
              } assigned`
        }
      />
      <CustomerGroupsManager initialGroups={groups} />
    </div>
  )
}
