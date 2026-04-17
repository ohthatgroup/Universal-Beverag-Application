import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { setSalesmanDisabled } from '@/lib/server/staff-invites'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  disabled: z.boolean().default(true),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request)

  try {
    const context = await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await params)
    const payload = await parseBody(request, bodySchema)

    if (payload.disabled && id === context.userId) {
      throw new RouteError(400, 'cannot_disable_self', 'You cannot disable your own admin account')
    }

    const result = await setSalesmanDisabled(id, payload.disabled)

    logApiEvent(requestId, 'staff_disabled_state_changed', {
      requestedBy: context.userId,
      profileId: id,
      disabled: payload.disabled,
    })

    return apiOk({ disabledAt: result.disabled_at }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'staff_disable_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
