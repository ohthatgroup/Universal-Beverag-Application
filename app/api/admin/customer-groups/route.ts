import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { resolveDefaultGroupId } from '@/lib/server/default-group'

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  sort_order: z.number().int().optional(),
})

interface GroupRow {
  id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string | Date
  updated_at: string | Date
  member_count: number
}

function rowToGroup(row: GroupRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sort_order: row.sort_order,
    member_count: Number(row.member_count ?? 0),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
  }
}

/** GET /api/admin/customer-groups — list groups with member counts. */
export async function GET(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const db = await getRequestDb()
    const [{ rows }, defaultGroupId] = await Promise.all([
      db.query<GroupRow>(
        `select g.id, g.name, g.description, g.sort_order, g.created_at, g.updated_at,
                (
                  select count(*)::int from profiles p
                  where p.customer_group_id = g.id and p.role = 'customer'
                ) as member_count
           from customer_groups g
          order by g.sort_order asc, lower(g.name) asc`,
      ),
      resolveDefaultGroupId(),
    ])
    const groups = rows.map((row) => ({
      ...rowToGroup(row),
      isDefault: row.id === defaultGroupId,
    }))
    return apiOk({ groups, defaultGroupId }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

/** POST /api/admin/customer-groups — create. */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, createGroupSchema)
    const db = await getRequestDb()

    const { rows } = await db.query<GroupRow>(
      `insert into customer_groups (name, description, sort_order)
       values (
         $1,
         $2,
         coalesce($3, (select coalesce(max(sort_order), -1) + 1 from customer_groups))
       )
       returning id, name, description, sort_order, created_at, updated_at,
                 0::int as member_count`,
      [payload.name, payload.description ?? null, payload.sort_order ?? null],
    )

    const created = rows[0]
    if (!created) throw new Error('Failed to create customer group')
    return apiOk({ group: rowToGroup(created) }, 201, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
