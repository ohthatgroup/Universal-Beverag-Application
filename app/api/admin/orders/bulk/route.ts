import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const orderStatusSchema = z.enum(['draft', 'submitted', 'delivered'])

const bulkSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('delete'),
    ids: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    action: z.literal('set_status'),
    ids: z.array(z.string().uuid()).min(1),
    status: orderStatusSchema,
  }),
])

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, bulkSchema)
    const db = await getRequestDb()
    const ids = Array.from(new Set(payload.ids))

    if (payload.action === 'delete') {
      await db.transaction(async (client) => {
        await client.query('delete from order_items where order_id = any($1::uuid[])', [ids])
        await client.query('delete from orders where id = any($1::uuid[])', [ids])
      })

      return apiOk({ deleted: ids.length }, 200, requestId)
    }

    const { rows: orders } = await db.query<{ id: string; submitted_at: string | null }>(
      `select id, submitted_at::text from orders where id = any($1::uuid[])`,
      [ids]
    )

    const now = new Date().toISOString()
    for (const order of orders ?? []) {
      const patch: {
        status: 'draft' | 'submitted' | 'delivered'
        submitted_at?: string | null
        delivered_at?: string | null
      } = {
        status: payload.status,
      }

      if (payload.status === 'draft') {
        patch.delivered_at = null
      }

      if (payload.status === 'submitted') {
        patch.submitted_at = order.submitted_at ?? now
        patch.delivered_at = null
      }

      if (payload.status === 'delivered') {
        patch.submitted_at = order.submitted_at ?? now
        patch.delivered_at = now
      }

      await db.query(
        `update orders
         set status = $2, submitted_at = $3, delivered_at = $4
         where id = $1`,
        [order.id, patch.status, patch.submitted_at ?? null, patch.delivered_at ?? null]
      )
    }

    return apiOk({ updated: orders?.length ?? 0 }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
