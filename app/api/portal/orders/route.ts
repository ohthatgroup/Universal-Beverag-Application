import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { requirePortalToken } from '@/lib/server/customer-order-access'
import { isoDateSchema } from '@/lib/server/schemas'

const createDraftSchema = z.object({
  deliveryDate: isoDateSchema,
})

/**
 * POST /api/portal/orders
 * Create or find a draft order for the customer + date.
 * Auth: X-Customer-Token header
 */
export async function POST(request: Request) {
  try {
    const token = requirePortalToken(request)
    const { customerId } = await resolveCustomerToken(token)

    const body = await request.json().catch(() => null)
    const payload = createDraftSchema.parse(body)

    const admin = createAdminClient()

    // Check for existing draft
    const { data: existingOrder, error: existingError } = await admin
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .eq('delivery_date', payload.deliveryDate)
      .eq('status', 'draft')
      .maybeSingle()

    if (existingError) throw existingError

    if (existingOrder) {
      return Response.json({ data: { order: existingOrder, created: false } })
    }

    // Create new draft
    const { data: order, error: insertError } = await admin
      .from('orders')
      .insert({
        customer_id: customerId,
        delivery_date: payload.deliveryDate,
        status: 'draft',
      })
      .select('*')
      .single()

    if (insertError) {
      // Race condition: another request created the draft
      if (insertError.code === '23505') {
        const { data: raceOrder } = await admin
          .from('orders')
          .select('*')
          .eq('customer_id', customerId)
          .eq('delivery_date', payload.deliveryDate)
          .eq('status', 'draft')
          .maybeSingle()

        if (raceOrder) {
          return Response.json({ data: { order: raceOrder, created: false } })
        }
      }
      throw insertError
    }

    return Response.json({ data: { order, created: true } }, { status: 201 })
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
