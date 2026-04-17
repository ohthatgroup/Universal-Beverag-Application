import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { revokeStaffInvite } from '@/lib/server/staff-invites'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request)

  try {
    const context = await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await params)
    const revoked = await revokeStaffInvite(id)

    logApiEvent(requestId, 'staff_invite_revoked', {
      requestedBy: context.userId,
      profileId: id,
      revoked,
    })

    return apiOk({ revoked }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'staff_invite_revoke_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
