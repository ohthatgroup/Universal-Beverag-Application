import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { getRequestDb } from '@/lib/server/db'
import { RouteError } from '@/lib/server/auth'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'
import { updateDeliveryDateSchema } from '@/lib/server/schemas'

/**
 * DELETE /api/portal/orders/[id]
 * Delete a customer order (items are deleted first due to FK constraint).
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

    await db.transaction(async (client) => {
      await client.query('delete from order_items where order_id = $1', [order.id])
      await client.query('delete from orders where id = $1', [order.id])
    })

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_order_delete_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}

/**
 * PATCH /api/portal/orders/[id]
 * Update mutable fields on a draft order. Currently scoped to delivery_date.
 * 409 if the customer already has another draft on the requested date.
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
    if (order.status !== 'draft') {
      throw new RouteError(409, 'order_locked', 'Only draft orders can be rescheduled.')
    }
    const payload = await parseBody(request, updateDeliveryDateSchema)
    if (payload.deliveryDate === order.delivery_date) {
      return apiOk({ orderId: order.id, deliveryDate: payload.deliveryDate }, 200, requestId)
    }
    const db = await getRequestDb()

    // Block when the customer already holds another draft on the target date
    // (the partial unique index would otherwise raise; surfacing the conflict
    // gives the UI a chance to redirect or warn).
    const { rows: existing } = await db.query<{ id: string }>(
      `select id
         from orders
        where customer_id = $1
          and delivery_date = $2
          and status = 'draft'
          and id <> $3
        limit 1`,
      [order.customer_id, payload.deliveryDate, order.id]
    )
    if (existing[0]) {
      throw new RouteError(
        409,
        'duplicate_draft',
        'You already have an open order for that date.',
      )
    }

    await db.query(
      `update orders set delivery_date = $1, updated_at = now() where id = $2`,
      [payload.deliveryDate, order.id]
    )

    return apiOk({ orderId: order.id, deliveryDate: payload.deliveryDate }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_order_patch_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}
