import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeProfile } from '@/lib/server/auth'
import type { Profile } from '@/lib/types'

export interface CustomerContext {
  customerId: string
  profile: Profile
  token: string
}

const TOKEN_REGEX = /^[0-9a-f]{32}$/

/**
 * Resolve a customer from their portal URL token.
 * Queries profiles via admin client (bypasses RLS).
 * Calls notFound() if the token is invalid or no matching customer exists.
 * Wrapped with React cache() to deduplicate layout + page calls per request.
 */
async function _resolveCustomerToken(token: string): Promise<CustomerContext> {
  if (!token || !TOKEN_REGEX.test(token)) {
    console.error(`[resolveCustomerToken] Invalid token format: "${token?.slice(0, 8)}..."`)
    notFound()
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    console.error('[resolveCustomerToken] Failed to create admin client:', err)
    throw err // Don't swallow as notFound — this is a server config error
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('access_token', token)
    .eq('role', 'customer')
    .maybeSingle()

  if (error) {
    console.error(`[resolveCustomerToken] DB error: ${error.message}`)
    notFound()
  }

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
