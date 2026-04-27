import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  customerGroupId: z.string().uuid(),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, schema)
    const db = await getRequestDb()

    const { rowCount } = await db.query(
      `update profiles
          set customer_group_id = $1, updated_at = now()
        where role = 'customer'
          and id = any($2::uuid[])`,
      [payload.customerGroupId, payload.ids],
    )

    return apiOk({ assigned: rowCount ?? 0 }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
