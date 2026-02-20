import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const bulkSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reorder'),
    orderedIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    action: z.literal('delete'),
    ids: z.array(z.string().uuid()).min(1),
  }),
])

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, bulkSchema)
    const admin = createAdminClient()

    if (payload.action === 'reorder') {
      const orderedIds = Array.from(new Set(payload.orderedIds))
      for (let index = 0; index < orderedIds.length; index += 1) {
        const id = orderedIds[index]
        const { error } = await admin
          .from('brands')
          .update({ sort_order: index })
          .eq('id', id)

        if (error) {
          throw error
        }
      }

      return apiOk({ reordered: true }, 200, requestId)
    }

    const ids = Array.from(new Set(payload.ids))
    const { error: unlinkError } = await admin
      .from('products')
      .update({ brand_id: null })
      .in('brand_id', ids)

    if (unlinkError) {
      throw unlinkError
    }

    const { error } = await admin.from('brands').delete().in('id', ids)

    if (error) {
      if (error.code === '23503') {
        throw new RouteError(
          409,
          'foreign_key_violation',
          'Some brands are still referenced and cannot be deleted'
        )
      }
      throw error
    }

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
