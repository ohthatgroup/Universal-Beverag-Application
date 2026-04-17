import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { requirePortalToken } from '@/lib/server/customer-order-access'
import { createOrGetDraftSchema } from '@/lib/server/schemas'

/**
 * POST /api/portal/orders
 * Create or find a draft order for the customer + date.
 * Auth: X-Customer-Token header
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    const token = requirePortalToken(request)
    const { customerId } = await resolveCustomerToken(token)
    const payload = await parseBody(request, createOrGetDraftSchema.pick({ deliveryDate: true }))
    const db = await getRequestDb()

    const { rows: existingRows } = await db.query(
      `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text
       from orders
       where customer_id = $1 and delivery_date = $2 and status = 'draft'
       limit 1`,
      [customerId, payload.deliveryDate]
    )

    if (existingRows[0]) {
      return apiOk({ order: existingRows[0], created: false }, 200, requestId)
    }

    try {
      const { rows } = await db.query(
        `insert into orders (customer_id, delivery_date, status)
         values ($1, $2, 'draft')
         returning id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text`,
        [customerId, payload.deliveryDate]
      )

      return apiOk({ order: rows[0], created: true }, 201, requestId)
    } catch (insertError) {
      if (
        typeof insertError === 'object' &&
        insertError !== null &&
        'code' in insertError &&
        (insertError as { code?: string }).code === '23505'
      ) {
        const { rows: raceRows } = await db.query(
          `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text
           from orders
           where customer_id = $1 and delivery_date = $2 and status = 'draft'
           limit 1`,
          [customerId, payload.deliveryDate]
        )

        if (raceRows[0]) {
          return apiOk({ order: raceRows[0], created: false }, 200, requestId)
        }
      }

      throw insertError
    }
  } catch (error) {
    logApiEvent(requestId, 'portal_order_create_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}
