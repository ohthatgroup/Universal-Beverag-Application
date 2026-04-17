import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { buildRateLimitKey, consumeRateLimit, getEnvRateLimit } from '@/lib/server/rate-limit'
import { sendStaffInviteEmail } from '@/lib/server/staff-invite-email'
import { createOrReuseStaffInvite, createOrUpdateSalesmanProfile } from '@/lib/server/staff-invites'

const createStaffSchema = z.object({
  contactName: z.string().trim().min(1),
  email: z.string().trim().email(),
  businessName: z.string().trim().optional().nullable(),
})

const inviteRateLimit = getEnvRateLimit('STAFF_INVITE_RATE_LIMIT_MAX', 'STAFF_INVITE_RATE_LIMIT_WINDOW_MS', {
  maxRequests: 6,
  windowMs: 10 * 60 * 1000,
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  try {
    const context = await requireAuthContext(['salesman'])
    const payload = await parseBody(request, createStaffSchema)

    consumeRateLimit({
      key: buildRateLimitKey('staff-invite', request, [context.userId]),
      ...inviteRateLimit,
    })

    const profile = await createOrUpdateSalesmanProfile({
      contactName: payload.contactName,
      email: payload.email,
      businessName: payload.businessName ?? null,
    })

    if (!profile) {
      throw new Error('Failed to create staff profile')
    }

    const invite = await createOrReuseStaffInvite({
      profileId: profile.id,
      email: payload.email,
      createdBy: context.userId,
    })

    await sendStaffInviteEmail({
      email: payload.email,
      inviteUrl: invite.inviteUrl,
      inviterName: context.profile.contact_name ?? context.profile.email,
      staffName: payload.contactName,
    })

    logApiEvent(requestId, 'staff_invite_created', {
      createdBy: context.userId,
      profileId: profile.id,
      inviteId: invite.inviteId,
    })

    return apiOk(
      {
        id: profile.id,
        inviteUrl: invite.inviteUrl,
      },
      201,
      requestId
    )
  } catch (error) {
    logApiEvent(requestId, 'staff_invite_create_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
