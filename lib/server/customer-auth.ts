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
 */
export async function resolveCustomerToken(token: string): Promise<CustomerContext> {
  if (!token || !TOKEN_REGEX.test(token)) {
    notFound()
  }

  const admin = createAdminClient()

  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('access_token', token)
    .eq('role', 'customer')
    .maybeSingle()

  if (error || !profile) {
    notFound()
  }

  return {
    customerId: profile.id,
    profile: normalizeProfile(profile),
    token,
  }
}
