import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { requirePortalToken } from '@/lib/server/customer-order-access'
import { portalProfileUpdateSchema } from '@/lib/server/schemas'

/**
 * PATCH /api/portal/profile
 * Update the customer's own contact info + address.
 * Auth: X-Customer-Token header
 */
export async function PATCH(request: Request) {
  const requestId = getRequestId(request)
  try {
    const token = requirePortalToken(request)
    const { customerId } = await resolveCustomerToken(token)
    const payload = await parseBody(request, portalProfileUpdateSchema)
    const db = await getRequestDb()

    const updates: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        updates[key] = value === '' ? null : value
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiOk({ updated: false }, 200, requestId)
    }

    const columns = Object.keys(updates)
    const values = columns.map((column) => updates[column])
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`)

    await db.query(
      `update profiles
       set ${assignments.join(', ')}, updated_at = now()
       where id = $${columns.length + 1}`,
      [...values, customerId]
    )

    return apiOk({ updated: true }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'portal_profile_update_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    if (error instanceof Response) return error
    return toErrorResponse(error, requestId)
  }
}
