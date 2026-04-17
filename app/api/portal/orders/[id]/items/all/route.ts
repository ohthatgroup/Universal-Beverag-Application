import { apiOk, getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { getRequestDb } from '@/lib/server/db'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'

/**
 * DELETE /api/portal/orders/[id]/items/all
 * Reset all items on a draft order.
 * Auth: X-Customer-Token header
 */
export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    const { order } = await requirePortalOrderAccess(id, token)
    const db = await getRequestDb()

    if (order.status !== 'draft') {
      return Response.json(
        { error: { code: 'order_not_draft', message: 'Can only modify draft orders' } },
        { status: 409 }
      )
    }

    await db.query('delete from order_items where order_id = $1', [order.id])

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_order_reset_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}
