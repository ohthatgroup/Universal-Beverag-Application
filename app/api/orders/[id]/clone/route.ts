import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { cloneOrderSchema } from '@/lib/server/schemas'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, cloneOrderSchema)
    const context = await requireOrderAccess(id)
    const db = await getRequestDb()
    const customerId = context.order.customer_id

    if (!customerId) {
      throw new Error('Order is missing customer reference')
    }

    const { rows: existingDraftRows } = await db.query(
      `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text
       from orders
       where customer_id = $1 and delivery_date = $2 and status = 'draft'
       limit 1`,
      [customerId, payload.deliveryDate]
    )
    if (existingDraftRows[0]) {
      return apiOk({ order: existingDraftRows[0], created: false }, 200, requestId)
    }

    const { rows: cloneRows } = await db.query<{ clone_order: string | null }>(
      'select clone_order($1::uuid, $2::date)',
      [context.order.id, payload.deliveryDate]
    )
    const newOrderId = cloneRows[0]?.clone_order ?? null
    if (!newOrderId) {
      throw new Error('clone_order RPC did not return an order id')
    }

    const { rows: newOrderRows } = await db.query(
      `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text
       from orders
       where id = $1
       limit 1`,
      [newOrderId]
    )
    const newOrder = newOrderRows[0]
    if (!newOrder) throw new Error('Cloned order not found')

    logApiEvent(requestId, 'order_cloned', {
      sourceOrderId: context.order.id,
      newOrderId,
      userId: context.userId,
    })
    return apiOk({ order: newOrder, created: true }, 201, requestId)
  } catch (error) {
    logApiEvent(requestId, 'order_clone_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
