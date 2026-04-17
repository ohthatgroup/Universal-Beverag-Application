import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { buildRateLimitKey, consumeRateLimit, getEnvRateLimit } from '@/lib/server/rate-limit'
import { sendStaffInviteEmail } from '@/lib/server/staff-invite-email'
import { createOrReuseStaffInvite } from '@/lib/server/staff-invites'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const inviteRateLimit = getEnvRateLimit('STAFF_INVITE_RATE_LIMIT_MAX', 'STAFF_INVITE_RATE_LIMIT_WINDOW_MS', {
  maxRequests: 6,
  windowMs: 10 * 60 * 1000,
})

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(_request)

  try {
    const context = await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await params)
    consumeRateLimit({
      key: buildRateLimitKey('staff-invite', _request, [context.userId]),
      ...inviteRateLimit,
    })

    const db = await getRequestDb()
    const { rows } = await db.query<{
      id: string
      email: string | null
      contact_name: string | null
    }>(
      `select id, email, contact_name
       from profiles
       where id = $1 and role = 'salesman'
       limit 1`,
      [id]
    )

    const staff = rows[0]
    if (!staff) {
      throw new RouteError(404, 'staff_not_found', 'Salesman profile not found')
    }
    if (!staff.email) {
      throw new RouteError(400, 'staff_email_missing', 'Salesman email is required before sending an invite')
    }

    const invite = await createOrReuseStaffInvite({
      profileId: staff.id,
      email: staff.email,
      createdBy: context.userId,
    })

    await sendStaffInviteEmail({
      email: staff.email,
      inviteUrl: invite.inviteUrl,
      inviterName: context.profile.contact_name ?? context.profile.email,
      staffName: staff.contact_name ?? staff.email,
    })

    logApiEvent(requestId, 'staff_invite_sent', {
      requestedBy: context.userId,
      profileId: staff.id,
      inviteId: invite.inviteId,
    })

    return apiOk({ inviteUrl: invite.inviteUrl }, 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'staff_invite_send_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
