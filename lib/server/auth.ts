import { createClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/lib/types'

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

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

  if (profileError || !profile) {
    throw new RouteError(
      403,
      'profile_missing',
      'Signed-in user does not have an application profile',
      profileError?.message
    )
  }

  return {
    supabase,
    userId: user.id,
    profile,
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
): Promise<AuthContext & { order: { id: string; customer_id: string; status: string } & Record<string, unknown> }> {
  const context = await requireAuthContext()

  const { data: order, error } = await context.supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    throw new RouteError(404, 'order_not_found', 'Order not found')
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
