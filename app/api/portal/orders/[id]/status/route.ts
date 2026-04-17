import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { getRequestDb } from '@/lib/server/db'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'
import { updateOrderStatusSchema } from '@/lib/server/schemas'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['draft'],
}

/**
 * PATCH /api/portal/orders/[id]/status
 * Transition order status. Customers can submit (draft->submitted) or cancel (submitted->draft).
 * Auth: X-Customer-Token header
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    const { order } = await requirePortalOrderAccess(id, token)
    const payload = await parseBody(request, updateOrderStatusSchema.pick({ status: true }))
    const db = await getRequestDb()

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(payload.status)) {
      return Response.json(
        { error: { code: 'invalid_transition', message: `Cannot change status from "${order.status}" to "${payload.status}"` } },
        { status: 409 }
      )
    }

    const submittedAt = payload.status === 'submitted' ? new Date().toISOString() : null

    const { rows } = await db.query(
      `update orders
       set status = $2, submitted_at = $3
       where id = $1
       returning id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text`,
      [order.id, payload.status, submittedAt]
    )

    return apiOk(rows[0], 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_order_status_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}
