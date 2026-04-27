import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const schema = z.object({
  customerId: z.string().uuid(),
  channel: z.enum(['whatsapp', 'sms', 'email']),
  kind: z.string().min(1).max(64),
  messageSnapshot: z.string().min(1).max(4000),
  relatedOrderId: z.string().uuid().optional(),
})

/**
 * Log a single outreach event. Called by every drawer that hands off
 * to a native-app channel (WhatsApp/SMS/Mail) — the click that opens
 * the URI also fires this so we can suppress re-firing prompts for
 * 21 days.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    const ctx = await requireAuthContext(['salesman'])
    const payload = await parseBody(request, schema)
    const db = await getRequestDb()

    const { rows } = await db.query<{ id: string }>(
      `insert into customer_outreach
          (customer_id, channel, kind, salesman_id, message_snapshot, related_order_id)
        values ($1, $2, $3, $4, $5, $6)
        returning id`,
      [
        payload.customerId,
        payload.channel,
        payload.kind,
        ctx.profile.id,
        payload.messageSnapshot,
        payload.relatedOrderId ?? null,
      ],
    )

    return apiOk({ id: rows[0]?.id }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
