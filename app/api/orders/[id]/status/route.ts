import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { updateOrderStatusSchema } from '@/lib/server/schemas'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

function isTransitionAllowed(current: string, next: string, role: 'customer' | 'salesman') {
  if (current === next) {
    return true
  }

  if (role === 'customer') {
    return current === 'draft' && next === 'submitted'
  }

  if (role === 'salesman') {
    if (current === 'draft' && next === 'submitted') return true
    if (current === 'submitted' && next === 'delivered') return true
    if (current === 'submitted' && next === 'draft') return true
  }

  return false
}

export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, updateOrderStatusSchema)
    const context = await requireOrderAccess(id)
    const db = await getRequestDb()
    const currentOrder = context.order

    if (!isTransitionAllowed(currentOrder.status, payload.status, context.profile.role)) {
      throw new RouteError(
        409,
        'invalid_transition',
        `Status transition from ${currentOrder.status} to ${payload.status} is not allowed`
      )
    }

    const patch: {
      status: 'draft' | 'submitted' | 'delivered'
      submitted_at?: string | null
      delivered_at?: string | null
    } = { status: payload.status }

    if (payload.status === 'submitted') {
      patch.submitted_at = currentOrder.submitted_at ?? new Date().toISOString()
      patch.delivered_at = null
    }

    if (payload.status === 'delivered') {
      patch.delivered_at = new Date().toISOString()
      patch.submitted_at = currentOrder.submitted_at ?? new Date().toISOString()
    }

    if (payload.status === 'draft') {
      patch.delivered_at = null
    }

    const { rows } = await db.query(
      `update orders
       set status = $2, submitted_at = $3, delivered_at = $4
       where id = $1
       returning id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text`,
      [context.order.id, patch.status, patch.submitted_at ?? null, patch.delivered_at ?? null]
    )
    const data = rows[0]
    if (!data) throw new Error('Order not found')

    logApiEvent(requestId, 'order_status_updated', {
      orderId: context.order.id,
      status: payload.status,
      userId: context.userId,
    })
    return apiOk(data, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'order_status_update_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
