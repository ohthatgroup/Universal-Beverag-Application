import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const schema = z.object({
  dealId: z.string().uuid(),
  groupIds: z.array(z.string().uuid()).min(1),
})

/**
 * Append a set of customer-group ids to an existing announcement's
 * `target_group_ids` (deduped). Used by the `uncovered-groups` "add
 * to existing deal" mode.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, schema)
    const db = await getRequestDb()

    await db.query(
      `update announcements
          set target_group_ids = (
                select array_agg(distinct elem)
                  from unnest(coalesce(target_group_ids, '{}'::uuid[]) || $2::uuid[]) elem
              ),
              updated_at = now()
        where id = $1`,
      [payload.dealId, payload.groupIds],
    )

    return apiOk({ added: payload.groupIds.length }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
