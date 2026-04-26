import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { requirePortalToken } from '@/lib/server/customer-order-access'
import { applyUsualsSchema } from '@/lib/server/schemas'

/**
 * POST /api/portal/orders/apply-usuals
 * Find or create a draft for (customer, deliveryDate) and fill it with
 * the customer's usuals. Optionally replace any in-flight items first.
 * Auth: X-Customer-Token header
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    const token = requirePortalToken(request)
    const { customerId } = await resolveCustomerToken(token)
    const payload = await parseBody(request, applyUsualsSchema)
    const db = await getRequestDb()

    const { rows } = await db.query<{ apply_usuals_to_draft: string | null }>(
      'select apply_usuals_to_draft($1::uuid, $2::date, $3::boolean)',
      [customerId, payload.deliveryDate, payload.replace ?? false]
    )
    const orderId = rows[0]?.apply_usuals_to_draft ?? null
    if (!orderId) {
      throw new Error('apply_usuals_to_draft did not return an order id')
    }

    return apiOk({ orderId }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_order_apply_usuals_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}
