import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const schema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        newEndsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(1),
})

/**
 * Per-row deal extension. Used by the `expiring-deals` drawer.
 * Each subject's date picker is independent; only rows whose date
 * was changed are sent.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, schema)
    const db = await getRequestDb()

    let extended = 0
    for (const update of payload.updates) {
      const { rowCount } = await db.query(
        `update announcements
            set ends_at = $2,
                updated_at = now()
          where id = $1`,
        [update.id, update.newEndsAt],
      )
      extended += rowCount ?? 0
    }
    return apiOk({ extended }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
