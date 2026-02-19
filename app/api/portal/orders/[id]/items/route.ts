import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'

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

    if (!payload.productId && !payload.palletDealId) {
      return Response.json(
        { error: { code: 'validation_error', message: 'Either productId or palletDealId is required' } },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('order_items')
      .upsert(
        {
          order_id: order.id,
          quantity: payload.quantity,
          unit_price: payload.unitPrice,
          product_id: payload.productId ?? null,
          pallet_deal_id: payload.palletDealId ?? null,
        },
        {
          onConflict: payload.productId
            ? 'order_id,product_id'
            : 'order_id,pallet_deal_id',
        }
      )

    if (error) throw error

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
