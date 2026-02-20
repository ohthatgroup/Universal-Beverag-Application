import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess, RouteError } from '@/lib/server/auth'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const upsertItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  palletDealId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
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
    throw new RouteError(400, 'validation_error', 'Provide either productId or palletDealId, not both')
  }
  if (!payload.productId && !payload.palletDealId) {
    throw new RouteError(400, 'validation_error', 'Either productId or palletDealId is required')
  }

  if (payload.productId) {
    return { column: 'product_id' as const, value: payload.productId }
  }

  return { column: 'pallet_deal_id' as const, value: payload.palletDealId as string }
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

    if (context.profile.role !== 'salesman') {
      throw new RouteError(403, 'forbidden', 'Salesman role required')
    }

    if (context.order.status !== 'draft') {
      throw new RouteError(409, 'order_not_draft', 'Can only modify draft orders')
    }

    const identity = resolveIdentity(payload)
    const existingQuery = context.supabase
      .from('order_items')
      .select('id,quantity')
      .eq('order_id', context.order.id)
      .eq(identity.column, identity.value)

    const { data: existing, error: existingError } =
      identity.column === 'product_id'
        ? await existingQuery.is('pallet_deal_id', null).maybeSingle()
        : await existingQuery.is('product_id', null).maybeSingle()

    if (existingError) {
      throw existingError
    }

    let operation: 'inserted' | 'incremented' = 'inserted'

    if (existing) {
      const { error: updateError } = await context.supabase
        .from('order_items')
        .update({
          quantity: existing.quantity + payload.quantity,
          unit_price: payload.unitPrice,
        })
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }
      operation = 'incremented'
    } else {
      const { error: insertError } = await context.supabase
        .from('order_items')
        .insert({
          order_id: context.order.id,
          quantity: payload.quantity,
          unit_price: payload.unitPrice,
          product_id: payload.productId ?? null,
          pallet_deal_id: payload.palletDealId ?? null,
        })

      if (insertError && isUniqueViolation(insertError)) {
        const retryQuery = context.supabase
          .from('order_items')
          .select('id,quantity')
          .eq('order_id', context.order.id)
          .eq(identity.column, identity.value)

        const { data: retriedExisting, error: retryError } =
          identity.column === 'product_id'
            ? await retryQuery.is('pallet_deal_id', null).maybeSingle()
            : await retryQuery.is('product_id', null).maybeSingle()

        if (retryError) {
          throw retryError
        }
        if (!retriedExisting) {
          throw insertError
        }

        const { error: retryUpdateError } = await context.supabase
          .from('order_items')
          .update({
            quantity: retriedExisting.quantity + payload.quantity,
            unit_price: payload.unitPrice,
          })
          .eq('id', retriedExisting.id)

        if (retryUpdateError) {
          throw retryUpdateError
        }
        operation = 'incremented'
      } else if (insertError) {
        throw insertError
      }
    }

    logApiEvent(requestId, 'order_item_upserted', {
      orderId: context.order.id,
      productId: payload.productId ?? null,
      palletDealId: payload.palletDealId ?? null,
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
