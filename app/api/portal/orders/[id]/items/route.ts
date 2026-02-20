import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
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
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    const { order } = await requirePortalOrderAccess(id, token)

    if (order.status !== 'draft') {
      return Response.json(
        { error: { code: 'order_not_draft', message: 'Can only modify draft orders' } },
        { status: 409 }
      )
    }

    const body = await request.json().catch(() => null)
    const payload = upsertItemSchema.parse(body)

    const identity = resolveIdentity(payload)
    if (!identity) {
      return Response.json(
        { error: { code: 'validation_error', message: 'Provide either productId or palletDealId' } },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const existingQuery = admin
      .from('order_items')
      .select('id')
      .eq('order_id', order.id)
      .eq(identity.column, identity.value)

    const { data: existing, error: existingError } =
      identity.column === 'product_id'
        ? await existingQuery.is('pallet_deal_id', null).maybeSingle()
        : await existingQuery.is('product_id', null).maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      const { error: updateError } = await admin
        .from('order_items')
        .update({
          quantity: payload.quantity,
          unit_price: payload.unitPrice,
        })
        .eq('id', existing.id)

      if (updateError) throw updateError
    } else {
      const { error: insertError } = await admin
        .from('order_items')
        .insert({
          order_id: order.id,
          quantity: payload.quantity,
          unit_price: payload.unitPrice,
          product_id: payload.productId ?? null,
          pallet_deal_id: payload.palletDealId ?? null,
        })

      if (insertError && isUniqueViolation(insertError)) {
        const retryQuery = admin
          .from('order_items')
          .select('id')
          .eq('order_id', order.id)
          .eq(identity.column, identity.value)

        const { data: retriedExisting, error: retryError } =
          identity.column === 'product_id'
            ? await retryQuery.is('pallet_deal_id', null).maybeSingle()
            : await retryQuery.is('product_id', null).maybeSingle()

        if (retryError) throw retryError
        if (!retriedExisting) throw insertError

        const { error: retryUpdateError } = await admin
          .from('order_items')
          .update({
            quantity: payload.quantity,
            unit_price: payload.unitPrice,
          })
          .eq('id', retriedExisting.id)

        if (retryUpdateError) throw retryUpdateError
      } else if (insertError) {
        throw insertError
      }
    }

    return Response.json({ data: { saved: true } })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { code: 'validation_error', message: 'Invalid request', details: error.flatten() } },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: { code: 'internal_error', message } }, { status: 500 })
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
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    const { order } = await requirePortalOrderAccess(id, token)

    if (order.status !== 'draft') {
      return Response.json(
        { error: { code: 'order_not_draft', message: 'Can only modify draft orders' } },
        { status: 409 }
      )
    }

    const body = await request.json().catch(() => null)
    const payload = deleteItemSchema.parse(body)

    if (!payload.productId && !payload.palletDealId) {
      return Response.json(
        { error: { code: 'validation_error', message: 'Either productId or palletDealId is required' } },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    let query = admin
      .from('order_items')
      .delete()
      .eq('order_id', order.id)

    if (payload.productId) {
      query = query.eq('product_id', payload.productId)
    } else if (payload.palletDealId) {
      query = query.eq('pallet_deal_id', payload.palletDealId)
    }

    const { error } = await query

    if (error) throw error

    return Response.json({ data: { deleted: true } })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { code: 'validation_error', message: 'Invalid request', details: error.flatten() } },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: { code: 'internal_error', message } }, { status: 500 })
  }
}
