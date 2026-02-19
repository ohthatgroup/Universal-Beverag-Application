import { createClient } from '@/lib/supabase/server'
import type { Database, Profile, UserRole } from '@/lib/types'

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>
type OrderRow = Database['public']['Tables']['orders']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface AuthContext {
  supabase: ServerSupabaseClient
  userId: string
  profile: Profile
}

export class RouteError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isRouteError(error: unknown): error is RouteError {
  return error instanceof RouteError
}

export async function getAuthContext(): Promise<
  | (AuthContext & { hasSession: true })
  | { supabase: ServerSupabaseClient; hasSession: false }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { supabase, hasSession: false }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || !isValidRole(profile.role)) {
    throw new RouteError(
      403,
      'profile_missing',
      'Signed-in user does not have an application profile',
      profileError?.message
    )
  }

  const normalizedProfile = normalizeProfile(profile)

  return {
    supabase,
    userId: user.id,
    profile: normalizedProfile,
    hasSession: true,
  }
}

export async function requireAuthContext(allowedRoles?: UserRole[]): Promise<AuthContext> {
  const context = await getAuthContext()

  if (!context.hasSession) {
    throw new RouteError(401, 'unauthorized', 'Authentication required')
  }

  if (allowedRoles && !allowedRoles.includes(context.profile.role)) {
    throw new RouteError(403, 'forbidden', 'Insufficient role permissions')
  }

  return context
}

export async function requireOrderAccess(
  orderId: string,
  options: { allowSalesman: boolean } = { allowSalesman: true }
): Promise<AuthContext & { order: OrderRow }> {
  const context = await requireAuthContext()

  const { data: order, error } = await context.supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    throw new RouteError(404, 'order_not_found', 'Order not found')
  }

  if (!order.customer_id) {
    throw new RouteError(500, 'order_data_invalid', 'Order is missing customer reference')
  }

  const isOwner = order.customer_id === context.userId
  const isSalesman = context.profile.role === 'salesman'

  if (!isOwner && !(options.allowSalesman && isSalesman)) {
    throw new RouteError(403, 'forbidden', 'You cannot access this order')
  }

  return {
    ...context,
    order,
  }
}

function isValidRole(value: string): value is UserRole {
  return value === 'customer' || value === 'salesman'
}

export function normalizeProfile(profile: ProfileRow): Profile {
  return {
    ...profile,
    role: profile.role as UserRole,
    show_prices: profile.show_prices ?? true,
    custom_pricing: profile.custom_pricing ?? false,
    default_group: profile.default_group === 'size' ? 'size' : 'brand',
    access_token: profile.access_token ?? null,
    created_at: profile.created_at ?? new Date(0).toISOString(),
    updated_at: profile.updated_at ?? new Date(0).toISOString(),
  }
}
