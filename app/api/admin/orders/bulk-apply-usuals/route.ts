import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const schema = z.object({ ids: z.array(z.string().uuid()).min(1) })

/**
 * Apply each customer's usuals (pinned products from the customer's
 * products & visibility page) to a batch of empty drafts. Reuses
 * the same `apply_usuals_to_draft(customer_id, delivery_date)`
 * function the customer portal uses.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, schema)
    const db = await getRequestDb()

    const { rows: drafts } = await db.query<{
      id: string
      customer_id: string | null
      delivery_date: string
    }>(
      `select id, customer_id, delivery_date::text
         from orders
        where status = 'draft' and id = any($1::uuid[])`,
      [payload.ids],
    )

    let applied = 0
    for (const draft of drafts) {
      if (!draft.customer_id) continue
      await db.query(
        `select apply_usuals_to_draft($1::uuid, $2::date, false)`,
        [draft.customer_id, draft.delivery_date],
      )
      applied += 1
    }
    return apiOk({ applied }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
