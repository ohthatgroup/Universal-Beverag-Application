import { z } from 'zod'
import { randomBytes } from 'crypto'
import { apiOk, getRequestId, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { buildRateLimitKey, consumeRateLimit, getEnvRateLimit } from '@/lib/server/rate-limit'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const portalTokenRateLimit = getEnvRateLimit(
  'PORTAL_TOKEN_ROTATION_RATE_LIMIT_MAX',
  'PORTAL_TOKEN_ROTATION_WINDOW_MS',
  {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  }
)

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const context = await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    consumeRateLimit({
      key: buildRateLimitKey('portal-token-rotation', request, [context.userId, id]),
      ...portalTokenRateLimit,
    })

    const db = await getRequestDb()
    const { rows } = await db.query<{ role: string }>(
      'select role from profiles where id = $1 limit 1',
      [id]
    )
    const profile = rows[0]
    if (!profile) {
      throw new RouteError(404, 'customer_not_found', 'Customer not found')
    }

    if (profile.role !== 'customer') {
      throw new RouteError(400, 'not_a_customer', 'Only customer profiles can have portal tokens')
    }

    // Generate new token
    const newToken = randomBytes(16).toString('hex')

    await db.query('update profiles set access_token = $2, updated_at = now() where id = $1', [id, newToken])

    void context // used for auth check

    return apiOk({ access_token: newToken }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
