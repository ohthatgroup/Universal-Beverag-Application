'use client'

import { createAuthClient } from '@neondatabase/auth'
import { SupabaseAuthAdapter, type SupabaseAuthAdapterInstance } from '@neondatabase/auth/vanilla'
import { buildInteractiveUrl } from '@/lib/config/public-url'

let client: SupabaseAuthAdapterInstance | null = null

function getBaseUrl() {
  return buildInteractiveUrl('/api/auth')
}

export function getAuthClient() {
  client ??= createAuthClient(getBaseUrl(), {
    adapter: SupabaseAuthAdapter(),
  }) as SupabaseAuthAdapterInstance

  return client
}
