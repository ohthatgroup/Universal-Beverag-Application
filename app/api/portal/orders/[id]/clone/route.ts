import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { getRequestDb } from '@/lib/server/db'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'
import { cloneOrderSchema } from '@/lib/server/schemas'

/**
 * POST /api/portal/orders/[id]/clone
 * Clone an order to a new delivery date.
 *
 * If a draft already exists at that date and `?replace=true` is set, the
 * existing draft's items are wiped and the source order's items are copied
 * in. Without the flag, the existing draft is returned untouched (idempotent
 * for the C5 "I already started a draft for that day" case).
 *
 * Auth: X-Customer-Token header
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    const { order, customerId } = await requirePortalOrderAccess(id, token)
    const payload = await parseBody(request, cloneOrderSchema)
    const url = new URL(request.url)
    const replace = url.searchParams.get('replace') === 'true'
    const db = await getRequestDb()

    const { rows: existingDraftRows } = await db.query(
      `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text
       from orders
       where customer_id = $1 and delivery_date = $2 and status = 'draft'
       limit 1`,
      [customerId, payload.deliveryDate]
    )

    const existingDraft = existingDraftRows[0] as { id: string } | undefined

    if (existingDraft && !replace) {
      return apiOk({ order: existingDraftRows[0], created: false }, 200, requestId)
    }

    if (existingDraft && replace) {
      // Replace flow: wipe the in-flight draft's items and copy in the
      // source order's items. Skips clone_order (which would raise on
      // duplicate draft).
      await db.query('delete from order_items where order_id = $1', [existingDraft.id])
      await db.query(
        `insert into order_items (order_id, product_id, quantity, unit_price)
         select $1, product_id, quantity, unit_price
         from order_items
         where order_id = $2 and quantity > 0`,
        [existingDraft.id, order.id]
      )

      const { rows: refreshedRows } = await db.query(
        `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text
         from orders
         where id = $1
         limit 1`,
        [existingDraft.id]
      )
      return apiOk({ order: refreshedRows[0], created: false }, 200, requestId)
    }

    const { rows: cloneRows } = await db.query<{ clone_order: string | null }>(
      'select clone_order($1::uuid, $2::date)',
      [order.id, payload.deliveryDate]
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
    if (!newOrder) {
      throw new Error('Cloned order not found')
    }

    return apiOk({ order: newOrder, created: true }, 201, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_order_clone_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}
