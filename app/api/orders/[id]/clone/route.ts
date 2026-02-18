import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess } from '@/lib/server/auth'
import { cloneOrderSchema } from '@/lib/server/schemas'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, cloneOrderSchema)
    const context = await requireOrderAccess(id)
    const customerId = context.order.customer_id

    if (!customerId) {
      throw new Error('Order is missing customer reference')
    }

    const { data: existingDraft } = await context.supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .eq('delivery_date', payload.deliveryDate)
      .eq('status', 'draft')
      .maybeSingle()

    if (existingDraft) {
      return apiOk({ order: existingDraft, created: false }, 200, requestId)
    }

    const { data: rpcData, error: rpcError } = await context.supabase.rpc('clone_order', {
      source_order_id: context.order.id,
      new_delivery_date: payload.deliveryDate,
    })

    if (rpcError) {
      throw rpcError
    }

    const newOrderId = typeof rpcData === 'string' ? rpcData : null
    if (!newOrderId) {
      throw new Error('clone_order RPC did not return an order id')
    }

    const { data: newOrder, error: selectError } = await context.supabase
      .from('orders')
      .select('*')
      .eq('id', newOrderId)
      .single()

    if (selectError) {
      throw selectError
    }

    logApiEvent(requestId, 'order_cloned', {
      sourceOrderId: context.order.id,
      newOrderId,
      userId: context.userId,
    })
    return apiOk({ order: newOrder, created: true }, 201, requestId)
  } catch (error) {
    logApiEvent(requestId, 'order_clone_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
