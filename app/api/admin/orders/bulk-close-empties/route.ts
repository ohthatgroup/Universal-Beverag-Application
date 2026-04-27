import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const schema = z.object({ ids: z.array(z.string().uuid()).min(1) })

/** Hard delete a batch of drafts. Used by the empty-cart-drafts and
 *  drafts-past-delivery cancel flows. */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, schema)
    const db = await getRequestDb()

    const { rowCount } = await db.query(
      `delete from orders where status = 'draft' and id = any($1::uuid[])`,
      [payload.ids],
    )
    return apiOk({ closed: rowCount ?? 0 }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
