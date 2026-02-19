import { z } from 'zod'
import { randomBytes } from 'crypto'
import { apiOk, getRequestId, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const admin = createAdminClient()

    // Verify this is a customer profile
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', id)
      .maybeSingle()

    if (profileError || !profile) {
      throw new RouteError(404, 'customer_not_found', 'Customer not found')
    }

    if (profile.role !== 'customer') {
      throw new RouteError(400, 'not_a_customer', 'Only customer profiles can have portal tokens')
    }

    // Generate new token
    const newToken = randomBytes(16).toString('hex')

    const { error: updateError } = await admin
      .from('profiles')
      .update({ access_token: newToken })
      .eq('id', id)

    if (updateError) throw updateError

    void context // used for auth check

    return apiOk({ access_token: newToken }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
