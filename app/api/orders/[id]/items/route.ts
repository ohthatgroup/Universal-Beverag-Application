import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess, RouteError } from '@/lib/server/auth'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const upsertItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  palletDealId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(0),
  unitPrice: z.number().min(0),
})

const deleteItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  palletDealId: z.string().uuid().nullable().optional(),
})

export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, upsertItemSchema)
    const context = await requireOrderAccess(id, { allowSalesman: true })

    if (context.profile.role !== 'salesman') {
      throw new RouteError(403, 'forbidden', 'Salesman role required')
    }

    if (context.order.status !== 'draft') {
      throw new RouteError(409, 'order_not_draft', 'Can only modify draft orders')
    }

    if (!payload.productId && !payload.palletDealId) {
      throw new RouteError(400, 'validation_error', 'Either productId or palletDealId is required')
    }

    const { error } = await context.supabase
      .from('order_items')
      .upsert(
        {
          order_id: context.order.id,
          quantity: payload.quantity,
          unit_price: payload.unitPrice,
          product_id: payload.productId ?? null,
          pallet_deal_id: payload.palletDealId ?? null,
        },
        {
          onConflict: payload.productId ? 'order_id,product_id' : 'order_id,pallet_deal_id',
        }
      )

    if (error) {
      throw error
    }

    logApiEvent(requestId, 'order_item_upserted', {
      orderId: context.order.id,
      productId: payload.productId ?? null,
      palletDealId: payload.palletDealId ?? null,
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

    if (context.profile.role !== 'salesman') {
      throw new RouteError(403, 'forbidden', 'Salesman role required')
    }

    if (context.order.status !== 'draft') {
      throw new RouteError(409, 'order_not_draft', 'Can only modify draft orders')
    }

    if (!payload.productId && !payload.palletDealId) {
      throw new RouteError(400, 'validation_error', 'Either productId or palletDealId is required')
    }

    let query = context.supabase
      .from('order_items')
      .delete()
      .eq('order_id', context.order.id)

    if (payload.productId) {
      query = query.eq('product_id', payload.productId)
    } else if (payload.palletDealId) {
      query = query.eq('pallet_deal_id', payload.palletDealId)
    }

    const { error } = await query

    if (error) {
      throw error
    }

    logApiEvent(requestId, 'order_item_deleted', {
      orderId: context.order.id,
      productId: payload.productId ?? null,
      palletDealId: payload.palletDealId ?? null,
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
