import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

// `palletDealId` accepted-and-ignored on the schema for backward
// compatibility with any old client builds.
const upsertItemSchema = z.object({
  productId: z.string().uuid(),
  palletDealId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
})

const deleteItemSchema = z.object({
  productId: z.string().uuid(),
  palletDealId: z.string().uuid().nullable().optional(),
})

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as { code: string }).code === '23505'
  )
}

export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, upsertItemSchema)
    const context = await requireOrderAccess(id, { allowSalesman: true })
    const db = await getRequestDb()

    if (context.profile.role !== 'salesman') {
      throw new RouteError(403, 'forbidden', 'Salesman role required')
    }

    if (context.order.status !== 'draft') {
      throw new RouteError(409, 'order_not_draft', 'Can only modify draft orders')
    }

    const { rows: existingRows } = await db.query<{ id: string; quantity: number }>(
      `select id, quantity
       from order_items
       where order_id = $1 and product_id = $2
       limit 1`,
      [context.order.id, payload.productId]
    )
    const existing = existingRows[0] ?? null

    let operation: 'inserted' | 'incremented' = 'inserted'

    if (existing) {
      await db.query(
        `update order_items
         set quantity = $2, unit_price = $3
         where id = $1`,
        [existing.id, existing.quantity + payload.quantity, payload.unitPrice]
      )
      operation = 'incremented'
    } else {
      try {
        await db.query(
          `insert into order_items (order_id, quantity, unit_price, product_id)
           values ($1, $2, $3, $4)`,
          [context.order.id, payload.quantity, payload.unitPrice, payload.productId]
        )
      } catch (insertError) {
        if (isUniqueViolation(insertError)) {
          const { rows: retryRows } = await db.query<{ id: string; quantity: number }>(
            `select id, quantity
             from order_items
             where order_id = $1 and product_id = $2
             limit 1`,
            [context.order.id, payload.productId]
          )
          const retriedExisting = retryRows[0]
          if (!retriedExisting) throw insertError

          await db.query(
            `update order_items
             set quantity = $2, unit_price = $3
             where id = $1`,
            [retriedExisting.id, retriedExisting.quantity + payload.quantity, payload.unitPrice]
          )
          operation = 'incremented'
        } else {
          throw insertError
        }
      }
    }

    logApiEvent(requestId, 'order_item_upserted', {
      orderId: context.order.id,
      productId: payload.productId,
      operation,
      userId: context.userId,
    })

    return apiOk({ saved: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'order_item_upsert_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}

export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, deleteItemSchema)
    const context = await requireOrderAccess(id, { allowSalesman: true })
    const db = await getRequestDb()

    if (context.profile.role !== 'salesman') {
      throw new RouteError(403, 'forbidden', 'Salesman role required')
    }

    if (context.order.status !== 'draft') {
      throw new RouteError(409, 'order_not_draft', 'Can only modify draft orders')
    }

    await db.query(
      `delete from order_items
       where order_id = $1 and product_id = $2`,
      [context.order.id, payload.productId]
    )

    logApiEvent(requestId, 'order_item_deleted', {
      orderId: context.order.id,
      productId: payload.productId,
      userId: context.userId,
    })

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'order_item_delete_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
