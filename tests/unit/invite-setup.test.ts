import { createHash } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteError } from '@/lib/server/route-error'
import { toSafeInviteSetupErrorMessage } from '@/lib/auth/safe-messages'

const query = vi.fn()
const createUser = vi.fn()
const setUserPassword = vi.fn()
const lookupNeonAuthUserId = vi.fn()

vi.mock('@/lib/server/db', () => ({
  getRequestDb: vi.fn(async () => ({
    query,
  })),
}))

vi.mock('@/lib/auth/server', () => ({
  getAuth: vi.fn(() => ({
    admin: {
      createUser,
      setUserPassword,
    },
  })),
}))

vi.mock('@/lib/server/neon-auth-users', () => ({
  lookupNeonAuthUserId,
}))

describe('invite setup', () => {
  beforeEach(() => {
    process.env.NEON_AUTH_COOKIE_SECRET = 'x'.repeat(32)
    query.mockReset()
    createUser.mockReset()
    setUserPassword.mockReset()
    lookupNeonAuthUserId.mockReset()
  })

  it('maps invite setup failures to safe messages', () => {
    expect(toSafeInviteSetupErrorMessage({ code: 'invite_invalid' })).toBe(
      'This admin invite link is invalid or has expired. Ask for a new invite and try again.'
    )
    expect(toSafeInviteSetupErrorMessage({ code: 'invite_accepted' })).toBe(
      'This admin invite has already been used. Sign in from the normal admin login screen.'
    )
    expect(toSafeInviteSetupErrorMessage({ code: 'rate_limited' })).toBe(
      'Too many invite setup attempts. Please wait before trying again.'
    )
  })

  it('rejects accepted invites with a safe route error', async () => {
    const { buildStaffInviteToken, completeStaffInviteSetup } = await import('@/lib/server/staff-invites')
    const token = buildStaffInviteToken('accepted-invite')

    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'accepted-invite',
          profile_id: 'profile-1',
          email: 'accepted@example.com',
          status: 'accepted',
          token_hash: createHash('sha256').update(token).digest('hex'),
          revoked_at: null,
          accepted_at: new Date().toISOString(),
          disabled_at: null,
          contact_name: 'Accepted User',
          business_name: null,
          auth_user_id: 'auth-1',
        },
      ],
    })

    await expect(
      completeStaffInviteSetup({
        token,
        password: 'Password123',
      })
    ).rejects.toMatchObject({
      code: 'invite_accepted',
      status: 409,
    } satisfies Partial<RouteError>)
  })

  it('sets the password for a legacy pending invite that already has an auth user', async () => {
    const { buildStaffInviteToken, completeStaffInviteSetup } = await import('@/lib/server/staff-invites')
    const token = buildStaffInviteToken('pending-invite')

    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'pending-invite',
            profile_id: 'profile-2',
            email: 'pending@example.com',
            status: 'pending',
            token_hash: createHash('sha256').update(token).digest('hex'),
            revoked_at: null,
            accepted_at: null,
            disabled_at: null,
            contact_name: 'Pending User',
            business_name: null,
            auth_user_id: 'auth-legacy',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    setUserPassword.mockResolvedValueOnce({ error: null })

    const result = await completeStaffInviteSetup({
      token,
      password: 'Password123',
    })

    expect(createUser).not.toHaveBeenCalled()
    expect(setUserPassword).toHaveBeenCalledWith({
      userId: 'auth-legacy',
      newPassword: 'Password123',
    })
    expect(result).toEqual({
      email: 'pending@example.com',
      authUserId: 'auth-legacy',
    })
  })
})
