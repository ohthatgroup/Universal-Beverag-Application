import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { toSafeInviteSetupErrorMessage } from '@/lib/auth/safe-messages'
import { isRouteError, RouteError } from '@/lib/server/route-error'
import { inviteSetupSchema } from '@/lib/server/schemas'
import { completeStaffInviteSetup } from '@/lib/server/staff-invites'

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  try {
    const body = await parseBody(request, inviteSetupSchema)
    const result = await completeStaffInviteSetup(body)

    logApiEvent(requestId, 'invite_setup_completed', {
      authUserId: result.authUserId,
    })

    return apiOk({ email: result.email }, 200, requestId)
  } catch (error) {
    const safeError =
      isRouteError(error)
        ? new RouteError(
            error.status,
            error.code,
            toSafeInviteSetupErrorMessage({ code: error.code, message: error.message }),
            error.details
          )
        : error

    logApiEvent(requestId, 'invite_setup_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })

    return toErrorResponse(safeError, requestId)
  }
}
