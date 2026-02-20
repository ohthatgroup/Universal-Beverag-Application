import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const updateItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0),
})

export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = await routeContext.params
    const payload = await parseBody(request, updateItemSchema)
    const admin = createAdminClient()

    if (payload.quantity === 0) {
      const { error } = await admin
        .from('pallet_deal_items')
        .delete()
        .eq('pallet_deal_id', id)
        .eq('product_id', payload.productId)

      if (error) {
        throw error
      }

      return apiOk({ deleted: true }, 200, requestId)
    }

    const { error } = await admin.from('pallet_deal_items').upsert(
      {
        pallet_deal_id: id,
        product_id: payload.productId,
        quantity: payload.quantity,
      },
      {
        onConflict: 'pallet_deal_id,product_id',
      }
    )

    if (error) {
      throw error
    }

    return apiOk({ saved: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
