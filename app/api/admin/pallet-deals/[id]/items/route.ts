import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const updateItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0),
})

export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = await routeContext.params
    const payload = await parseBody(request, updateItemSchema)
    const db = await getRequestDb()
    const { rows: dealRows } = await db.query<{ pallet_type: string }>(
      'select pallet_type from pallet_deals where id = $1 limit 1',
      [id]
    )
    const deal = dealRows[0] ?? null
    if (!deal) {
      return toErrorResponse(new Error('Pallet deal not found'), requestId)
    }
    const isSingleType = deal.pallet_type === 'single'

    if (payload.quantity === 0) {
      await db.query(
        'delete from pallet_deal_items where pallet_deal_id = $1 and product_id = $2',
        [id, payload.productId]
      )

      return apiOk({ deleted: true }, 200, requestId)
    }

    if (isSingleType) {
      await db.query(
        'delete from pallet_deal_items where pallet_deal_id = $1 and product_id <> $2',
        [id, payload.productId]
      )
    }

    await db.query(
      `insert into pallet_deal_items (pallet_deal_id, product_id, quantity)
       values ($1, $2, $3)
       on conflict (pallet_deal_id, product_id)
       do update set quantity = excluded.quantity`,
      [id, payload.productId, isSingleType ? 1 : payload.quantity]
    )

    return apiOk({ saved: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
