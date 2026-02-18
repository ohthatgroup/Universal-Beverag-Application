import { apiError, apiOk, getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])

    if (process.env.FEATURE_ECWID_PUSH !== 'true') {
      return apiError(
        503,
        'feature_disabled',
        'Ecwid push is disabled for launch. Set FEATURE_ECWID_PUSH=true to enable.',
        undefined,
        requestId
      )
    }

    logApiEvent(requestId, 'ecwid_push_requested')
    return apiOk(
      { message: 'Ecwid push is enabled but integration is not implemented yet.' },
      501,
      requestId
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
