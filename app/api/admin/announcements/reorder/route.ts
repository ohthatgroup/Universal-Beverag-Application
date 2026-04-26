import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { announcementReorderSchema } from '@/lib/server/schemas'

/**
 * PATCH /api/admin/announcements/reorder
 * Body: `{ updates: [{ id, sort_order }, ...] }`
 *
 * Bulk sort_order update used by the manager's drag/up/down arrows. All rows
 * are written in a single transaction so the customer-side homepage query
 * never sees a partially-applied reorder.
 */
export async function PATCH(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, announcementReorderSchema)
    const db = await getRequestDb()

    await db.transaction(async (client) => {
      for (const update of payload.updates) {
        await client.query(
          'update announcements set sort_order = $2 where id = $1',
          [update.id, update.sort_order],
        )
      }
    })

    return apiOk({ updated: payload.updates.length }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
