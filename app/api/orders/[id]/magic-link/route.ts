import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { generateOrderMagicLink } from '@/lib/server/order-links'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const context = await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)

    const { data: order, error: orderError } = await context.supabase
      .from('orders')
      .select('id,customer_id')
      .eq('id', id)
      .maybeSingle()

    if (orderError) {
      throw orderError
    }

    if (!order) {
      throw new RouteError(404, 'order_not_found', 'Order not found')
    }

    if (!order.customer_id) {
      throw new RouteError(500, 'order_data_invalid', 'Order is missing customer reference')
    }

    const { data: customer, error: customerError } = await context.supabase
      .from('profiles')
      .select('id,role,email')
      .eq('id', order.customer_id)
      .eq('role', 'customer')
      .maybeSingle()

    if (customerError) {
      throw customerError
    }

    if (!customer) {
      throw new RouteError(404, 'customer_not_found', 'Customer profile for this order was not found')
    }

    const linkPayload = await generateOrderMagicLink({
      orderId: order.id,
      customerId: customer.id,
      customerEmail: customer.email,
    })

    logApiEvent(requestId, 'order_magic_link_generated', {
      orderId: linkPayload.orderId,
      customerId: linkPayload.customerId,
      customerEmail: linkPayload.customerEmail,
      generatedBy: context.userId,
    })

    return apiOk(linkPayload, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'order_magic_link_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
