import { apiOk, getRequestId, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

/** Bulk lookup: given `?ids=<csv>`, returns `{ id, email, phone }`
 *  per customer. Used by the outreach drawer to gate channel buttons
 *  on each customer's available contact methods. */
export async function GET(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const url = new URL(request.url)
    const idsParam = url.searchParams.get('ids') ?? ''
    const ids = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    if (ids.length === 0) {
      return apiOk({ customers: [] }, 200, requestId)
    }
    const db = await getRequestDb()
    const { rows } = await db.query<{
      id: string
      email: string | null
      phone: string | null
    }>(
      `select id, email, phone from profiles where role = 'customer' and id = any($1::uuid[])`,
      [ids],
    )
    return apiOk({ customers: rows }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
