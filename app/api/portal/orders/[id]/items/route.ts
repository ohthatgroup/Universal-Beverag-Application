import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { getRequestDb } from '@/lib/server/db'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'

const upsertItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  palletDealId: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().int().min(0),
  unitPrice: z.coerce.number().min(0),
})

const deleteItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
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

function resolveIdentity(payload: { productId?: string | null; palletDealId?: string | null }) {
  if (payload.productId && payload.palletDealId) {
    return null
  }
  if (!payload.productId && !payload.palletDealId) {
    return null
  }

  if (payload.productId) {
    return { column: 'product_id' as const, value: payload.productId }
  }

  return { column: 'pallet_deal_id' as const, value: payload.palletDealId as string }
}

/**
 * PUT /api/portal/orders/[id]/items
 * Upsert an order item (auto-save). Quantity 0 is handled by DELETE.
 * Auth: X-Customer-Token header
 */
export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    const { order } = await requirePortalOrderAccess(id, token)
    const payload = await parseBody(request, upsertItemSchema)
    const db = await getRequestDb()

    if (order.status !== 'draft') {
      return Response.json(
        { error: { code: 'order_not_draft', message: 'Can only modify draft orders' } },
        { status: 409 }
      )
    }

    const identity = resolveIdentity(payload)
    if (!identity) {
      return Response.json(
        { error: { code: 'validation_error', message: 'Provide either productId or palletDealId' } },
        { status: 400 }
      )
    }

    const { rows: existingRows } = await db.query<{ id: string }>(
      `select id
       from order_items
       where order_id = $1
         and ${identity.column} = $2
         and ${identity.column === 'product_id' ? 'pallet_deal_id is null' : 'product_id is null'}
       limit 1`,
      [order.id, identity.value]
    )
    const existing = existingRows[0] ?? null

    if (existing) {
      await db.query(
        `update order_items
         set quantity = $2, unit_price = $3
         where id = $1`,
        [existing.id, payload.quantity, payload.unitPrice]
      )
    } else {
      try {
        await db.query(
          `insert into order_items (order_id, quantity, unit_price, product_id, pallet_deal_id)
           values ($1, $2, $3, $4, $5)`,
          [order.id, payload.quantity, payload.unitPrice, payload.productId ?? null, payload.palletDealId ?? null]
        )
      } catch (insertError) {
        if (isUniqueViolation(insertError)) {
          const { rows: retryRows } = await db.query<{ id: string }>(
            `select id
             from order_items
             where order_id = $1
               and ${identity.column} = $2
               and ${identity.column === 'product_id' ? 'pallet_deal_id is null' : 'product_id is null'}
             limit 1`,
            [order.id, identity.value]
          )
          const retriedExisting = retryRows[0]
          if (!retriedExisting) {
            throw insertError
          }

          await db.query(
            `update order_items
             set quantity = $2, unit_price = $3
             where id = $1`,
            [retriedExisting.id, payload.quantity, payload.unitPrice]
          )
        } else {
          throw insertError
        }
      }
    }

    return apiOk({ saved: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_order_item_upsert_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}

/**
 * DELETE /api/portal/orders/[id]/items
 * Delete a specific order item (auto-save when quantity reaches 0).
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
    const payload = await parseBody(request, deleteItemSchema)
    const db = await getRequestDb()

    if (order.status !== 'draft') {
      return Response.json(
        { error: { code: 'order_not_draft', message: 'Can only modify draft orders' } },
        { status: 409 }
      )
    }

    if (!payload.productId && !payload.palletDealId) {
      return Response.json(
        { error: { code: 'validation_error', message: 'Either productId or palletDealId is required' } },
        { status: 400 }
      )
    }

    await db.query(
      `delete from order_items
       where order_id = $1 and ${payload.productId ? 'product_id = $2' : 'pallet_deal_id = $2'}`,
      [order.id, payload.productId ?? payload.palletDealId]
    )

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_order_item_delete_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}
