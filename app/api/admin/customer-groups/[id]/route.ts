import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const paramsSchema = z.object({ id: z.string().uuid() })

const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
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

/** PATCH /api/admin/customer-groups/[id] — update name/description/order. */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, updateGroupSchema)
    const db = await getRequestDb()

    const sets: string[] = []
    const values: unknown[] = [id]
    let paramIndex = 2
    const addSet = (column: string, value: unknown) => {
      sets.push(`${column} = $${paramIndex}`)
      values.push(value)
      paramIndex += 1
    }
    if ('name' in payload) addSet('name', payload.name)
    if ('description' in payload) addSet('description', payload.description ?? null)
    if ('sort_order' in payload) addSet('sort_order', payload.sort_order)

    if (sets.length === 0) {
      const { rows } = await db.query<GroupRow>(
        `select id, name, description, sort_order, created_at, updated_at,
                (select count(*)::int from profiles p
                  where p.customer_group_id = customer_groups.id
                    and p.role = 'customer') as member_count
           from customer_groups where id = $1 limit 1`,
        [id],
      )
      const row = rows[0]
      if (!row) throw new RouteError(404, 'group_not_found', 'Customer group not found')
      return apiOk({ group: rowToGroup(row) }, 200, requestId)
    }

    const sql = `update customer_groups
                 set ${sets.join(', ')}
                 where id = $1
                 returning id, name, description, sort_order, created_at, updated_at,
                           (select count(*)::int from profiles p
                             where p.customer_group_id = customer_groups.id
                               and p.role = 'customer') as member_count`

    const { rows } = await db.query<GroupRow>(sql, values)
    const updated = rows[0]
    if (!updated) throw new RouteError(404, 'group_not_found', 'Customer group not found')
    return apiOk({ group: rowToGroup(updated) }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

/** DELETE /api/admin/customer-groups/[id] — also nulls every member's customer_group_id via ON DELETE SET NULL. */
export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const db = await getRequestDb()

    // Group-scope overrides cascade-delete via the FK on
    // announcement_overrides? No — scope_id has no FK (polymorphic). Clean
    // those up explicitly so we don't leak orphan overrides.
    await db.transaction(async (client) => {
      await client.query(
        `delete from announcement_overrides where scope = 'group' and scope_id = $1`,
        [id],
      )
      const result = await client.query('delete from customer_groups where id = $1', [id])
      if (result.rowCount === 0) {
        throw new RouteError(404, 'group_not_found', 'Customer group not found')
      }
    })

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
