import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { getRequestDb } from '@/lib/server/db'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'

// `palletDealId` is accepted-and-ignored on the input schema for backward
// compatibility with any in-flight client builds; it never makes it past
// validation. Once the rollout is stable this can be tightened.
const upsertItemSchema = z.object({
  productId: z.string().uuid(),
  palletDealId: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().int().min(0),
  unitPrice: z.coerce.number().min(0),
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

/**
 * GET /api/portal/orders/[id]/items
 * Return the order's product line items joined with product details.
 * Used by the order-history preview sheet.
 * Auth: X-Customer-Token header
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    await requirePortalOrderAccess(id, token)
    const db = await getRequestDb()

    const { rows } = await db.query<{
      id: string
      product_id: string | null
      quantity: number
      unit_price: number
      line_total: number | null
      product_title: string | null
      product_image_url: string | null
      product_pack_details: string | null
      product_pack_count: number | null
      product_size_value: number | null
      product_size_uom: string | null
    }>(
      `select
         oi.id,
         oi.product_id,
         oi.quantity,
         oi.unit_price,
         oi.line_total,
         p.title         as product_title,
         p.image_url     as product_image_url,
         p.pack_details  as product_pack_details,
         p.pack_count    as product_pack_count,
         p.size_value    as product_size_value,
         p.size_uom      as product_size_uom
       from order_items oi
       left join products p on p.id = oi.product_id
       where oi.order_id = $1
         and oi.quantity > 0
       order by oi.id asc`,
      [id]
    )

    return apiOk({ items: rows }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_order_items_get_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}

/**
 * PUT /api/portal/orders/[id]/items
 * Upsert a product line item (auto-save). Quantity 0 is handled by DELETE.
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

    const { rows: existingRows } = await db.query<{ id: string }>(
      `select id
       from order_items
       where order_id = $1
         and product_id = $2
       limit 1`,
      [order.id, payload.productId]
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
          `insert into order_items (order_id, quantity, unit_price, product_id)
           values ($1, $2, $3, $4)`,
          [order.id, payload.quantity, payload.unitPrice, payload.productId]
        )
      } catch (insertError) {
        if (isUniqueViolation(insertError)) {
          const { rows: retryRows } = await db.query<{ id: string }>(
            `select id
             from order_items
             where order_id = $1
               and product_id = $2
             limit 1`,
            [order.id, payload.productId]
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
 * Delete a specific product line item (auto-save when quantity reaches 0).
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

    await db.query(
      `delete from order_items
       where order_id = $1 and product_id = $2`,
      [order.id, payload.productId]
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
