import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const schema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  announcementId: z.string().uuid(),
})

/**
 * Append a set of product ids to an existing announcement's
 * `product_ids` (deduped). Used by the `hot-product-not-featured`
 * "add to existing deal" mode.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, schema)
    const db = await getRequestDb()

    await db.query(
      `update announcements
          set product_ids = (
                select array_agg(distinct elem)
                  from unnest(coalesce(product_ids, '{}'::uuid[]) || $2::uuid[]) elem
              )
        where id = $1`,
      [payload.announcementId, payload.productIds],
    )

    return apiOk({ added: payload.productIds.length }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
