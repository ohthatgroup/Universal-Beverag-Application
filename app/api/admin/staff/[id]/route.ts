import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)

  try {
    const context = await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await params)

    if (id === context.userId) {
      throw new RouteError(400, 'cannot_delete_self', 'You cannot delete your own admin account')
    }

    const db = await getRequestDb()
    const { rows } = await db.query<{ id: string; role: string; disabled_at: string | null }>(
      'select id, role, disabled_at from profiles where id = $1 limit 1',
      [id]
    )
    const existing = rows[0]
    if (!existing) {
      throw new RouteError(404, 'staff_not_found', 'Staff record not found')
    }
    if (existing.role !== 'salesman') {
      throw new RouteError(400, 'not_staff', 'Profile is not a staff record')
    }

    await db.query('delete from profiles where id = $1', [id])

    logApiEvent(requestId, 'staff_deleted', {
      requestedBy: context.userId,
      profileId: id,
    })

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'staff_delete_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
