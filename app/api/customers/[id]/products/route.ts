import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const updateCustomerProductSchema = z.object({
  productId: z.string().uuid(),
  hidden: z.boolean().optional(),
  customPrice: z.number().min(0).nullable().optional(),
})

export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, updateCustomerProductSchema)
    const context = await requireAuthContext(['salesman'])

    const hidden = payload.hidden ?? false
    const customPrice = payload.customPrice ?? null

    if (!hidden && customPrice === null) {
      const { error } = await context.supabase
        .from('customer_products')
        .delete()
        .eq('customer_id', id)
        .eq('product_id', payload.productId)

      if (error) {
        throw error
      }

      return apiOk({ deleted: true }, 200, requestId)
    }

    const { error } = await context.supabase
      .from('customer_products')
      .upsert(
        {
          customer_id: id,
          product_id: payload.productId,
          excluded: hidden,
          custom_price: customPrice,
        },
        { onConflict: 'customer_id,product_id' }
      )

    if (error) {
      throw error
    }

    logApiEvent(requestId, 'customer_product_updated', {
      customerId: id,
      productId: payload.productId,
      hidden,
      userId: context.userId,
    })

    return apiOk({ saved: true }, 200, requestId)
  } catch (error) {
    if (error instanceof RouteError) {
      logApiEvent(requestId, 'customer_product_update_failed', {
        code: error.code,
        error: error.message,
      })
    } else {
      logApiEvent(requestId, 'customer_product_update_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      })
    }
    return toErrorResponse(error, requestId)
  }
}
