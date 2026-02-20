import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const bulkSchema = z.object({
  action: z.literal('delete'),
  ids: z.array(z.string().uuid()).min(1),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, bulkSchema)
    const admin = createAdminClient()
    const requestedIds = Array.from(new Set(payload.ids))

    const { data: existingCustomers, error: listError } = await admin
      .from('profiles')
      .select('id')
      .in('id', requestedIds)
      .eq('role', 'customer')

    if (listError) {
      throw listError
    }

    const ids = (existingCustomers ?? []).map((customer) => customer.id)
    if (ids.length === 0) {
      return apiOk({ deleted: 0 }, 200, requestId)
    }

    const { error: deleteError } = await admin
      .from('profiles')
      .delete()
      .in('id', ids)
      .eq('role', 'customer')

    if (deleteError) {
      if (deleteError.code === '23503') {
        throw new RouteError(
          409,
          'foreign_key_violation',
          'Some selected customers have related records and cannot be deleted'
        )
      }
      throw deleteError
    }

    return apiOk({ deleted: ids.length }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
