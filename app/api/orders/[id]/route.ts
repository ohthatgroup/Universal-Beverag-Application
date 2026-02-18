import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const context = await requireOrderAccess(id, { allowSalesman: true })

    // Use admin client to bypass RLS for deletion
    const admin = createAdminClient()

    // Delete order items first (foreign key constraint)
    const { error: itemsError } = await admin
      .from('order_items')
      .delete()
      .eq('order_id', context.order.id)

    if (itemsError) {
      throw itemsError
    }

    // Delete the order
    const { error: orderError } = await admin
      .from('orders')
      .delete()
      .eq('id', context.order.id)

    if (orderError) {
      throw orderError
    }

    logApiEvent(requestId, 'order_deleted', {
      orderId: context.order.id,
      userId: context.userId,
    })

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'order_delete_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
