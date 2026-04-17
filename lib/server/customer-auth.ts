import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getRequestDb } from '@/lib/server/db'
import { normalizeProfile } from '@/lib/server/auth'
import type { Database, Profile } from '@/lib/types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface CustomerContext {
  customerId: string
  profile: Profile
  token: string
}

const TOKEN_REGEX = /^[0-9a-f]{32}$/

/**
 * Resolve a customer from their portal URL token.
 * Queries profiles through the shared DB layer.
 * Calls notFound() if the token is invalid or no matching customer exists.
 * Wrapped with React cache() to deduplicate layout + page calls per request.
 */
async function _resolveCustomerToken(token: string): Promise<CustomerContext> {
  if (!token || !TOKEN_REGEX.test(token)) {
    console.error(`[resolveCustomerToken] Invalid token format: "${token?.slice(0, 8)}..."`)
    notFound()
  }

  const db = await getRequestDb()
  const result = await db.query<ProfileRow>(
    `
      select *
      from profiles
      where access_token = $1
        and role = 'customer'
      limit 1
    `,
    [token]
  )
  const profile = result.rows[0]

  if (!profile) {
    console.error(`[resolveCustomerToken] No profile found for token: "${token.slice(0, 8)}..."`)
    notFound()
  }

  return {
    customerId: profile.id,
    profile: normalizeProfile(profile),
    token,
  }
}

export const resolveCustomerToken = cache(_resolveCustomerToken)
