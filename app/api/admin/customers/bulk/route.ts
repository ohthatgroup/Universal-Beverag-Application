import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const bulkSchema = z.object({
  action: z.literal('delete'),
  ids: z.array(z.string().uuid()).min(1),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, bulkSchema)
    const db = await getRequestDb()
    const requestedIds = Array.from(new Set(payload.ids))

    const { rows: existingCustomers } = await db.query<{ id: string }>(
      `select id from profiles where role = 'customer' and id = any($1::uuid[])`,
      [requestedIds]
    )
    const ids = existingCustomers.map((customer) => customer.id)
    if (ids.length === 0) {
      return apiOk({ deleted: 0 }, 200, requestId)
    }

    try {
      await db.query(`delete from profiles where role = 'customer' and id = any($1::uuid[])`, [ids])
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23503'
      ) {
        throw new RouteError(
          409,
          'foreign_key_violation',
          'Some selected customers have related records and cannot be deleted'
        )
      }
      throw error
    }

    return apiOk({ deleted: ids.length }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
