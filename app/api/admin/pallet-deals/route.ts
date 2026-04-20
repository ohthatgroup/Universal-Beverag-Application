import { apiOk, getRequestId, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  try {
    await requireAuthContext(['salesman'])
    const db = await getRequestDb()
    const { rows } = await db.query<{ id: string }>(
      `insert into pallet_deals (title, pallet_type, price, savings_text, description, is_active, sort_order)
       values ('New Pallet Deal', 'single', 0.01, null, null, true, coalesce((select max(sort_order) from pallet_deals), -1) + 1)
       returning id`
    )

    const created = rows[0]
    if (!created) {
      throw new Error('Failed to create pallet deal')
    }

    return apiOk({ palletDealId: created.id }, 201, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
