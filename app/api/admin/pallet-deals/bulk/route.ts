import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const bulkSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reorder'),
    orderedIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    action: z.literal('delete'),
    ids: z.array(z.string().uuid()).min(1),
  }),
])

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, bulkSchema)
    const db = await getRequestDb()

    if (payload.action === 'reorder') {
      const orderedIds = Array.from(new Set(payload.orderedIds))
      await db.transaction(async (client) => {
        for (let index = 0; index < orderedIds.length; index += 1) {
          await client.query('update pallet_deals set sort_order = $2 where id = $1', [orderedIds[index], index])
        }
      })

      return apiOk({ reordered: true }, 200, requestId)
    }

    const ids = Array.from(new Set(payload.ids))
    try {
      await db.query('delete from pallet_deals where id = any($1::uuid[])', [ids])
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
          'Some pallet deals are referenced by orders and cannot be deleted'
        )
      }
      throw error
    }

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
