import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

// This client bypasses Row Level Security.
// Only use in API routes (server-side only). Never import on the client.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
