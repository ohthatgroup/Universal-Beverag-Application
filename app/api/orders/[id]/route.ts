import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

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
    const db = await getRequestDb()
    await db.transaction(async (client) => {
      await client.query('delete from order_items where order_id = $1', [context.order.id])
      await client.query('delete from orders where id = $1', [context.order.id])
    })

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
