import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'

const updateStatusSchema = z.object({
  status: z.enum(['submitted', 'draft']),
})

// Allowed transitions for customers: draft → submitted, submitted → draft (cancel)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['draft'],
}

/**
 * PATCH /api/portal/orders/[id]/status
 * Transition order status. Customers can submit (draft→submitted) or cancel (submitted→draft).
 * Auth: X-Customer-Token header
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    const { order } = await requirePortalOrderAccess(id, token)

    const body = await request.json().catch(() => null)
    const payload = updateStatusSchema.parse(body)

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(payload.status)) {
      return Response.json(
        { error: { code: 'invalid_transition', message: `Cannot change status from "${order.status}" to "${payload.status}"` } },
        { status: 409 }
      )
    }

    const admin = createAdminClient()

    const updateFields: Record<string, unknown> = { status: payload.status }
    if (payload.status === 'submitted') {
      updateFields.submitted_at = new Date().toISOString()
    }
    if (payload.status === 'draft') {
      updateFields.submitted_at = null
    }

    const { data, error } = await admin
      .from('orders')
      .update(updateFields)
      .eq('id', order.id)
      .select('*')
      .single()

    if (error) throw error

    return Response.json({ data })
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
