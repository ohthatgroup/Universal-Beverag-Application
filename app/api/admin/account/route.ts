import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const updateAccountSchema = z.object({
  office_email: z
    .string()
    .trim()
    .email()
    .max(320)
    .nullable()
    .or(z.literal('').transform(() => null)),
})

export async function PATCH(request: Request) {
  const requestId = getRequestId(request)
  try {
    const context = await requireAuthContext(['salesman'])
    const body = await parseBody(request, updateAccountSchema)
    const db = await getRequestDb()

    const { rows } = await db.query<{ id: string; office_email: string | null }>(
      `update profiles
       set office_email = $2, updated_at = now()
       where id = $1
       returning id, office_email`,
      [context.userId, body.office_email]
    )

    const updated = rows[0]
    if (!updated) {
      throw new Error('Profile not found for signed-in user')
    }

    logApiEvent(requestId, 'admin_account_updated', {
      profileId: context.userId,
      hasOfficeEmail: !!updated.office_email,
    })

    return apiOk({ office_email: updated.office_email }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'admin_account_update_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
