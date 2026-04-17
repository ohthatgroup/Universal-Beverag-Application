import { auth } from '@/lib/auth/server'
import { getRequestDb } from '@/lib/server/db'
import { RouteError } from '@/lib/server/route-error'
import { markPendingStaffInvitesAccepted } from '@/lib/server/staff-invites'
import type { Database, Profile, UserRole } from '@/lib/types'

type OrderRow = Database['public']['Tables']['orders']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface AuthContext {
  authUserId: string
  userId: string
  profile: Profile
}

export { RouteError, isRouteError } from '@/lib/server/route-error'

export async function getAuthContext(): Promise<
  | (AuthContext & { hasSession: true })
  | { hasSession: false }
> {
  const { data: session, error } = await auth.getSession()

  if (error || !session?.user) {
    return { hasSession: false }
  }

  const profile = await resolveProfileForUser(session.user.id, session.user.email)

  if (!profile || !isValidRole(profile.role)) {
    throw new RouteError(
      403,
      'profile_missing',
      'Signed-in user does not have an application profile',
      session.user.email
    )
  }

  const normalizedProfile = normalizeProfile(profile)

  if (normalizedProfile.role === 'salesman' && normalizedProfile.disabled_at) {
    throw new RouteError(403, 'admin_disabled', 'This admin account is disabled')
  }

  if (normalizedProfile.role === 'salesman') {
    await markPendingStaffInvitesAccepted({
      profileId: normalizedProfile.id,
      email: normalizedProfile.email,
      authUserId: session.user.id,
    })
  }

  return {
    authUserId: session.user.id,
    userId: profile.id,
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
  const db = await getRequestDb()
  const orderResult = await db.query<OrderRow>('select * from orders where id = $1 limit 1', [orderId])
  const order = orderResult.rows[0]

  if (!order) {
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

async function resolveProfileForUser(authUserId: string, email: string) {
  const db = await getRequestDb()

  const directProfile = await db.query<ProfileRow>(
    'select * from profiles where auth_user_id = $1 limit 1',
    [authUserId]
  )
  if (directProfile.rows[0]) {
    return directProfile.rows[0]
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return null
  }

  const fallbackProfiles = await db.query<ProfileRow>(
    `
      select *
      from profiles
      where lower(coalesce(email, '')) = $1
      order by created_at asc
      limit 2
    `,
    [normalizedEmail]
  )

  if (fallbackProfiles.rows.length !== 1) {
    return null
  }

  const profile = fallbackProfiles.rows[0]
  if (!profile.auth_user_id) {
    await db.query('update profiles set auth_user_id = $1 where id = $2 and auth_user_id is null', [
      authUserId,
      profile.id,
    ])
    return {
      ...profile,
      auth_user_id: authUserId,
    }
  }

  return profile
}

export function normalizeProfile(profile: ProfileRow): Profile {
  return {
    ...profile,
    role: profile.role as UserRole,
    show_prices: profile.show_prices ?? true,
    custom_pricing: profile.custom_pricing ?? false,
    default_group: profile.default_group === 'size' ? 'size' : 'brand',
    access_token: profile.access_token ?? null,
    disabled_at: profile.disabled_at ?? null,
    created_at: profile.created_at ?? new Date(0).toISOString(),
    updated_at: profile.updated_at ?? new Date(0).toISOString(),
  }
}
