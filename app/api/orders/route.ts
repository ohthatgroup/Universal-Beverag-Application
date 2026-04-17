import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { createOrGetDraftSchema, isoDateSchema, orderStatusSchema } from '@/lib/server/schemas'
import { getRequestDb } from '@/lib/server/db'

const listQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  deliveryDate: isoDateSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  customerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export async function GET(request: Request) {
  const requestId = getRequestId(request)
  try {
    const context = await requireAuthContext()
    const db = await getRequestDb()
    const params = Object.fromEntries(new URL(request.url).searchParams.entries())
    const query = listQuerySchema.parse(params)

    logApiEvent(requestId, 'orders_list_requested', {
      userId: context.userId,
      role: context.profile.role,
    })

    const filters = ['1=1']
    const values: unknown[] = []
    const push = (value: unknown, sql: string) => {
      values.push(value)
      filters.push(sql.replace('?', `$${values.length}`))
    }

    if (context.profile.role === 'customer') {
      push(context.userId, 'customer_id = ?')
    } else if (query.customerId) {
      push(query.customerId, 'customer_id = ?')
    }
    if (query.status) push(query.status, 'status = ?')
    if (query.deliveryDate) push(query.deliveryDate, 'delivery_date = ?')
    if (query.from) push(query.from, 'delivery_date >= ?')
    if (query.to) push(query.to, 'delivery_date <= ?')
    values.push(query.limit)

    const { rows } = await db.query(
      `select id, customer_id, delivery_date::text, status, total, item_count, submitted_at::text, delivered_at::text, created_at::text, updated_at::text
       from orders
       where ${filters.join(' and ')}
       order by delivery_date desc, created_at desc
       limit $${values.length}`,
      values
    )

    return apiOk(rows, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'orders_list_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    const context = await requireAuthContext()
    const db = await getRequestDb()
    const payload = await parseBody(request, createOrGetDraftSchema)

    const customerId =
      context.profile.role === 'customer' ? context.userId : payload.customerId

    if (!customerId) {
      throw new RouteError(
        400,
        'validation_error',
        'Salesman must include customerId when creating customer drafts'
      )
    }

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
    logApiEvent(requestId, 'order_create_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
