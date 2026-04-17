import { RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new RouteError(
      500,
      'neon_auth_not_configured',
      `Missing required environment variable: ${name}`
    )
  }
  return value
}

function extractAuthUserId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const direct =
    (typeof record.id === 'string' && record.id) ||
    (typeof record.user_id === 'string' && record.user_id) ||
    null
  if (direct) return direct

  const data = record.data
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>
    if (typeof nested.id === 'string') return nested.id
    if (typeof nested.user_id === 'string') return nested.user_id
    const user = nested.user
    if (user && typeof user === 'object') {
      const userRecord = user as Record<string, unknown>
      if (typeof userRecord.id === 'string') return userRecord.id
      if (typeof userRecord.user_id === 'string') return userRecord.user_id
    }
  }

  const user = record.user
  if (user && typeof user === 'object') {
    const userRecord = user as Record<string, unknown>
    if (typeof userRecord.id === 'string') return userRecord.id
    if (typeof userRecord.user_id === 'string') return userRecord.user_id
  }

  return null
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>

  if (typeof record.message === 'string' && record.message) {
    return record.message
  }

  const error = record.error
  if (error && typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>
    if (typeof errorRecord.message === 'string' && errorRecord.message) {
      return errorRecord.message
    }
  }

  return null
}

function isExistingUserFailure(status: number, payload: unknown) {
  if (status === 409) return true

  const message = extractErrorMessage(payload)?.toLowerCase() ?? ''
  return message.includes('already exists') || message.includes('already registered')
}

export async function lookupNeonAuthUserId(email: string) {
  const db = await getRequestDb()
  const { rows } = await db.query<{ id: string }>(
    `select id::text
     from neon_auth."user"
     where lower(email) = lower($1)
     order by "createdAt" desc
     limit 1`,
    [email]
  )
  return rows[0]?.id ?? null
}

async function waitForNeonAuthUserId(email: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = await lookupNeonAuthUserId(email)
    if (id) return id
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
  }
  return null
}

async function createNeonAuthUser(email: string, name: string) {
  const apiKey = requireEnv('NEON_API_KEY')
  const projectId = requireEnv('NEON_PROJECT_ID')
  const branchId = requireEnv('NEON_BRANCH_ID')

  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/auth/users`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
      }),
    }
  )

  const payload = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    if (isExistingUserFailure(response.status, payload)) {
      return waitForNeonAuthUserId(email)
    }

    const message = extractErrorMessage(payload) ?? 'Failed to create Neon Auth user'
    throw new RouteError(502, 'neon_auth_create_failed', message)
  }

  return extractAuthUserId(payload) ?? (await waitForNeonAuthUserId(email))
}

export async function ensureNeonAuthUser(input: { email: string; name: string }) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()

  let authUserId: string | null = await lookupNeonAuthUserId(email)
  if (!authUserId) {
    authUserId = await createNeonAuthUser(email, name || email)
  }

  if (!authUserId) {
    throw new RouteError(
      502,
      'neon_auth_lookup_failed',
      'Neon Auth user was created but could not be resolved from Neon auth records'
    )
  }

  return authUserId as string
}
