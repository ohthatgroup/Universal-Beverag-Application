import { RouteError } from '@/lib/server/auth'

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new RouteError(
      500,
      'staff_invite_email_not_configured',
      `Missing required environment variable: ${name}`
    )
  }
  return value
}

export async function sendStaffInviteEmail(input: {
  email: string
  inviteUrl: string
  inviterName?: string | null
  staffName?: string | null
}) {
  const apiKey = requireEnv('RESEND_API_KEY')
  const from = requireEnv('INVITES_FROM_EMAIL')
  const inviterName = input.inviterName?.trim() || 'Universal Beverages'
  const staffName = input.staffName?.trim() || input.email

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: 'Set up your Universal Beverages admin access',
      html: `
        <p>Hello ${staffName},</p>
        <p>${inviterName} invited you to Universal Beverages admin access.</p>
        <p><a href="${input.inviteUrl}">Open your admin invite</a></p>
        <p>This link starts your password setup flow. After you set a password, sign in from the normal admin login screen.</p>
      `,
      text: [
        `Hello ${staffName},`,
        '',
        `${inviterName} invited you to Universal Beverages admin access.`,
        '',
        `Open your admin invite: ${input.inviteUrl}`,
        '',
        'This link starts your password setup flow. After you set a password, sign in from the normal admin login screen.',
      ].join('\n'),
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
    const message =
      (typeof payload?.message === 'string' && payload.message) ||
      (payload?.error &&
      typeof payload.error === 'object' &&
      typeof (payload.error as { message?: unknown }).message === 'string'
        ? ((payload.error as { message?: string }).message ?? null)
        : null) ||
      'Failed to send invite email'

    throw new RouteError(502, 'staff_invite_email_failed', message)
  }
}
