import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'
import { isoDateSchema } from '@/lib/server/schemas'

const cloneSchema = z.object({
  deliveryDate: isoDateSchema,
})

/**
 * POST /api/portal/orders/[id]/clone
 * Clone an order to a new delivery date.
 * Auth: X-Customer-Token header
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    const { order, customerId } = await requirePortalOrderAccess(id, token)

    const body = await request.json().catch(() => null)
    const payload = cloneSchema.parse(body)

    const admin = createAdminClient()

    // Check for existing draft on target date
    const { data: existingDraft } = await admin
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .eq('delivery_date', payload.deliveryDate)
      .eq('status', 'draft')
      .maybeSingle()

    if (existingDraft) {
      return Response.json({ data: { order: existingDraft, created: false } })
    }

    // Use clone_order RPC
    const { data: rpcData, error: rpcError } = await admin.rpc('clone_order', {
      source_order_id: order.id,
      new_delivery_date: payload.deliveryDate,
    })

    if (rpcError) throw rpcError

    const newOrderId = typeof rpcData === 'string' ? rpcData : null
    if (!newOrderId) {
      throw new Error('clone_order RPC did not return an order id')
    }

    const { data: newOrder, error: selectError } = await admin
      .from('orders')
      .select('*')
      .eq('id', newOrderId)
      .single()

    if (selectError) throw selectError

    return Response.json({ data: { order: newOrder, created: true } }, { status: 201 })
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
