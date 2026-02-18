import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { generateOrderMagicLink } from '@/lib/server/order-links'
import { isoDateSchema } from '@/lib/server/schemas'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const createMagicLinkSchema = z.object({
  deliveryDate: isoDateSchema,
})

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, createMagicLinkSchema)

    const adminClient = createAdminClient()
    const { data: customer, error: customerError } = await adminClient
      .from('profiles')
      .select('id,role,email')
      .eq('id', id)
      .eq('role', 'customer')
      .maybeSingle()

    if (customerError) {
      throw customerError
    }

    if (!customer) {
      throw new RouteError(404, 'customer_not_found', 'Customer not found')
    }

    if (!customer.email) {
      throw new RouteError(
        400,
        'customer_email_missing',
        'Customer does not have an email address configured'
      )
    }

    const { data: existingOrder, error: existingOrderError } = await adminClient
      .from('orders')
      .select('id,customer_id,delivery_date')
      .eq('customer_id', customer.id)
      .eq('delivery_date', payload.deliveryDate)
      .eq('status', 'draft')
      .maybeSingle()

    if (existingOrderError) {
      throw existingOrderError
    }

    let order = existingOrder

    if (!order) {
      const { data: insertedOrder, error: insertError } = await adminClient
        .from('orders')
        .insert({
          customer_id: customer.id,
          delivery_date: payload.deliveryDate,
          status: 'draft',
        })
        .select('id,customer_id,delivery_date')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: raceOrder, error: raceError } = await adminClient
            .from('orders')
            .select('id,customer_id,delivery_date')
            .eq('customer_id', customer.id)
            .eq('delivery_date', payload.deliveryDate)
            .eq('status', 'draft')
            .maybeSingle()

          if (raceError) {
            throw raceError
          }

          order = raceOrder
        } else {
          throw insertError
        }
      } else {
        order = insertedOrder
      }
    }

    if (!order) {
      throw new Error('Unable to create or load draft order for magic link')
    }

    const linkPayload = await generateOrderMagicLink({
      orderId: order.id,
      customerId: customer.id,
      customerEmail: customer.email,
    })

    logApiEvent(requestId, 'customer_magic_link_generated', {
      customerId: customer.id,
      customerEmail: customer.email,
      orderId: order.id,
      deliveryDate: order.delivery_date,
    })

    return apiOk(
      {
        ...linkPayload,
        deliveryDate: order.delivery_date,
      },
      200,
      requestId
    )
  } catch (error) {
    logApiEvent(requestId, 'customer_magic_link_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
