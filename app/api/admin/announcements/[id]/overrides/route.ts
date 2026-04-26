import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const paramsSchema = z.object({ id: z.string().uuid() })

const upsertOverrideSchema = z.object({
  scope: z.enum(['group', 'customer']),
  scope_id: z.string().uuid(),
  // Both nullable so a single PUT can clear individual columns without
  // affecting the other. Not present in payload → not modified.
  is_hidden: z.boolean().nullable().optional(),
  sort_order: z.number().int().nullable().optional(),
})

const deleteOverrideSchema = z.object({
  scope: z.enum(['group', 'customer']),
  scope_id: z.string().uuid(),
})

/**
 * PUT /api/admin/announcements/[id]/overrides
 * Upsert a `(announcement_id, scope, scope_id)` row in announcement_overrides.
 * Each column on the override (is_hidden, sort_order) is independently
 * settable — null clears the column to "inherit from parent scope," omitted
 * fields preserve current values.
 *
 * Use cases:
 *   - Salesman pins a deal to top-of-list for a group → PUT with
 *     scope='group', sort_order=0
 *   - Salesman hides an announcement from one customer → PUT with
 *     scope='customer', is_hidden=true
 *   - Salesman uses "Set for all" on the deals page → PUT scope='group',
 *     sort_order=N (the new global sort_order they just set)
 */
export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id: announcementId } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, upsertOverrideSchema)
    const db = await getRequestDb()

    // Build the update set dynamically so omitted fields don't get clobbered
    // to null on existing rows.
    const updateSets: string[] = ['updated_at = now()']
    const values: unknown[] = [announcementId, payload.scope, payload.scope_id]
    let paramIndex = 4

    if ('is_hidden' in payload) {
      updateSets.push(`is_hidden = $${paramIndex}`)
      values.push(payload.is_hidden ?? null)
      paramIndex += 1
    }
    if ('sort_order' in payload) {
      updateSets.push(`sort_order = $${paramIndex}`)
      values.push(payload.sort_order ?? null)
      paramIndex += 1
    }

    // Insert vs update — upsert via ON CONFLICT.
    const insertColumns = ['announcement_id', 'scope', 'scope_id']
    const insertValues = ['$1', '$2', '$3']
    if ('is_hidden' in payload) {
      insertColumns.push('is_hidden')
      insertValues.push(`$${insertColumns.length}`) // placeholder index = column count
    }
    if ('sort_order' in payload) {
      insertColumns.push('sort_order')
      insertValues.push(`$${insertColumns.length}`)
    }

    // Rebuild values for the insert path (different order than UPDATE).
    // Easier: just do the UPSERT in two steps using do-update.
    await db.query(
      `insert into announcement_overrides (announcement_id, scope, scope_id, is_hidden, sort_order)
       values ($1, $2, $3, $4, $5)
       on conflict (announcement_id, scope, scope_id)
       do update set
         is_hidden = case when $6::boolean then excluded.is_hidden else announcement_overrides.is_hidden end,
         sort_order = case when $7::boolean then excluded.sort_order else announcement_overrides.sort_order end,
         updated_at = now()`,
      [
        announcementId,
        payload.scope,
        payload.scope_id,
        payload.is_hidden ?? null,
        payload.sort_order ?? null,
        'is_hidden' in payload,
        'sort_order' in payload,
      ],
    )

    return apiOk({ saved: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

/**
 * DELETE /api/admin/announcements/[id]/overrides
 * Remove an override row entirely. Used by the "Apply Group Default"
 * affordance on the customer-edit page (DELETE the customer-scope row,
 * leaving the group-scope row in place — the customer now inherits from
 * the group).
 */
export async function DELETE(request: Request, routeContext: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id: announcementId } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, deleteOverrideSchema)
    const db = await getRequestDb()

    const result = await db.query(
      `delete from announcement_overrides
       where announcement_id = $1 and scope = $2 and scope_id = $3`,
      [announcementId, payload.scope, payload.scope_id],
    )
    if (result.rowCount === 0) {
      throw new RouteError(404, 'override_not_found', 'No override to remove')
    }
    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
