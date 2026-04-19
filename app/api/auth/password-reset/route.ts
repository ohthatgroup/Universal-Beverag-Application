import { createHash } from 'crypto'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { getAuth } from '@/lib/auth/server'
import { buildPasswordResetCallbackUrl } from '@/lib/config/public-url'
import { buildRateLimitKey, consumeRateLimit, getEnvRateLimit } from '@/lib/server/rate-limit'
import { RouteError } from '@/lib/server/auth'
import { passwordResetRequestSchema } from '@/lib/server/schemas'

const resetRateLimit = getEnvRateLimit(
  'PASSWORD_RESET_RATE_LIMIT_MAX',
  'PASSWORD_RESET_RATE_LIMIT_WINDOW_MS',
  {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
  }
)

function hashEmailForAudit(email: string) {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  try {
    consumeRateLimit({
      key: buildRateLimitKey('password-reset', request),
      ...resetRateLimit,
    })

    const payload = await parseBody(request, passwordResetRequestSchema)
    const result = await getAuth().requestPasswordReset({
      email: payload.email,
      redirectTo: buildPasswordResetCallbackUrl(),
    })

    if (result.error) {
      throw new RouteError(
        502,
        'password_reset_request_failed',
        'Unable to start password reset'
      )
    }

    logApiEvent(requestId, 'password_reset_requested', {
      emailHash: hashEmailForAudit(payload.email),
    })

    return apiOk({ ok: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'password_reset_request_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
