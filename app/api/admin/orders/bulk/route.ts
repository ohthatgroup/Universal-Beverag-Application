import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const orderStatusSchema = z.enum(['draft', 'submitted', 'delivered'])

const bulkSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('delete'),
    ids: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    action: z.literal('set_status'),
    ids: z.array(z.string().uuid()).min(1),
    status: orderStatusSchema,
  }),
])

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, bulkSchema)
    const admin = createAdminClient()
    const ids = Array.from(new Set(payload.ids))

    if (payload.action === 'delete') {
      const { error: itemDeleteError } = await admin
        .from('order_items')
        .delete()
        .in('order_id', ids)

      if (itemDeleteError) {
        throw itemDeleteError
      }

      const { error: orderDeleteError } = await admin
        .from('orders')
        .delete()
        .in('id', ids)

      if (orderDeleteError) {
        throw orderDeleteError
      }

      return apiOk({ deleted: ids.length }, 200, requestId)
    }

    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id,submitted_at')
      .in('id', ids)

    if (ordersError) {
      throw ordersError
    }

    const now = new Date().toISOString()
    for (const order of orders ?? []) {
      const patch: {
        status: 'draft' | 'submitted' | 'delivered'
        submitted_at?: string | null
        delivered_at?: string | null
      } = {
        status: payload.status,
      }

      if (payload.status === 'draft') {
        patch.delivered_at = null
      }

      if (payload.status === 'submitted') {
        patch.submitted_at = order.submitted_at ?? now
        patch.delivered_at = null
      }

      if (payload.status === 'delivered') {
        patch.submitted_at = order.submitted_at ?? now
        patch.delivered_at = now
      }

      const { error: updateError } = await admin
        .from('orders')
        .update(patch)
        .eq('id', order.id)

      if (updateError) {
        throw updateError
      }
    }

    return apiOk({ updated: orders?.length ?? 0 }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
