import { createAdminClient } from '@/lib/supabase/admin'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { requirePortalToken } from '@/lib/server/customer-order-access'
import { portalProfileUpdateSchema } from '@/lib/server/schemas'
import { apiOk, toErrorResponse } from '@/lib/server/api'

/**
 * PATCH /api/portal/profile
 * Update the customer's own contact info + address.
 * Auth: X-Customer-Token header
 */
export async function PATCH(request: Request) {
  try {
    const token = requirePortalToken(request)
    const { customerId } = await resolveCustomerToken(token)

    const body = await request.json().catch(() => null)
    const payload = portalProfileUpdateSchema.parse(body)

    const admin = createAdminClient()

    // Only update provided fields — convert empty strings to null for optional fields
    const updates: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        updates[key] = value === '' ? null : value
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiOk({ updated: false })
    }

    const { error } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', customerId)

    if (error) throw error

    return apiOk({ updated: true })
  } catch (error) {
    if (error instanceof Response) return error
    return toErrorResponse(error)
  }
}
