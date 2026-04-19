import { createHash, createHmac, randomUUID } from 'crypto'
import { buildAbsoluteUrl, buildPasswordResetCallbackUrl } from '@/lib/config/public-url'
import { getAuth } from '@/lib/auth/server'
import { RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { ensureNeonAuthUser } from '@/lib/server/neon-auth-users'

export interface StaffListRow {
  id: string
  business_name: string | null
  contact_name: string | null
  email: string | null
  auth_user_id: string | null
  disabled_at: string | null
  invite_id: string | null
  invite_status: 'pending' | 'accepted' | 'revoked' | null
  last_sent_at: string | null
}

function requireInviteSignerSecret() {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim()
  if (!secret) {
    throw new RouteError(
      500,
      'staff_invites_not_configured',
      'Missing required environment variable: NEON_AUTH_COOKIE_SECRET'
    )
  }
  return secret
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function signInviteId(inviteId: string) {
  return createHmac('sha256', requireInviteSignerSecret()).update(inviteId).digest('base64url')
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function buildStaffInviteToken(inviteId: string) {
  return `${inviteId}.${signInviteId(inviteId)}`
}

export function buildStaffInvitePath(token: string) {
  return `/auth/accept-invite?token=${encodeURIComponent(token)}`
}

export function buildStaffInviteUrl(token: string) {
  return buildAbsoluteUrl(buildStaffInvitePath(token))
}

export async function listStaffRows() {
  const db = await getRequestDb()
  const { rows } = await db.query<StaffListRow>(
    `select
        p.id,
        p.business_name,
        p.contact_name,
        p.email,
        p.auth_user_id,
        p.disabled_at::text,
        si.id as invite_id,
        si.status as invite_status,
        si.last_sent_at::text
      from profiles p
      left join staff_invites si
        on si.profile_id = p.id
       and si.status = 'pending'
      where p.role = 'salesman'
      order by
        coalesce(p.contact_name, p.business_name, p.email, p.id::text) asc,
        p.created_at asc`
  )

  return rows
}

async function findSalesmanProfile(profileId: string) {
  const db = await getRequestDb()
  const { rows } = await db.query<{
    id: string
    business_name: string | null
    contact_name: string | null
    email: string | null
    auth_user_id: string | null
    disabled_at: string | null
  }>(
    `select id, business_name, contact_name, email, auth_user_id, disabled_at::text
     from profiles
     where id = $1 and role = 'salesman'
     limit 1`,
    [profileId]
  )
  return rows[0] ?? null
}

export async function createOrUpdateSalesmanProfile(input: {
  email: string
  contactName: string
  businessName?: string | null
}) {
  const db = await getRequestDb()
  const email = normalizeEmail(input.email)
  const contactName = input.contactName.trim()
  const businessName = input.businessName?.trim() || null

  if (!email) {
    throw new RouteError(400, 'validation_error', 'Email is required')
  }
  if (!contactName) {
    throw new RouteError(400, 'validation_error', 'Name is required')
  }

  const { rows: matches } = await db.query<{
    id: string
    role: 'customer' | 'salesman'
  }>(
    `select id, role
     from profiles
     where lower(coalesce(email, '')) = $1
     order by created_at asc`,
    [email]
  )

  const otherRole = matches.find((row) => row.role !== 'salesman')
  if (otherRole) {
    throw new RouteError(
      409,
      'staff_email_conflict',
      'That email is already used by a non-staff profile'
    )
  }

  const existing = matches.find((row) => row.role === 'salesman')
  if (existing) {
    const { rows } = await db.query<{
      id: string
      business_name: string | null
      contact_name: string | null
      email: string | null
    }>(
      `update profiles
       set business_name = $2,
           contact_name = $3,
           email = $4,
           updated_at = now()
       where id = $1
       returning id, business_name, contact_name, email`,
      [existing.id, businessName, contactName, email]
    )
    return rows[0] ?? null
  }

  const { rows } = await db.query<{
    id: string
    business_name: string | null
    contact_name: string | null
    email: string | null
  }>(
    `insert into profiles (id, role, business_name, contact_name, email)
     values ($1, 'salesman', $2, $3, $4)
     returning id, business_name, contact_name, email`,
    [randomUUID(), businessName, contactName, email]
  )

  return rows[0] ?? null
}

export async function createOrReuseStaffInvite(input: {
  profileId: string
  email: string
  createdBy: string
}) {
  const db = await getRequestDb()
  const email = normalizeEmail(input.email)
  const profile = await findSalesmanProfile(input.profileId)

  if (!profile) {
    throw new RouteError(404, 'staff_not_found', 'Salesman profile not found')
  }

  if (!profile.email || normalizeEmail(profile.email) !== email) {
    throw new RouteError(
      400,
      'staff_email_mismatch',
      'The invite email must match the salesman profile email'
    )
  }

  const { rows: pendingRows } = await db.query<{ id: string; token_hash: string }>(
    `select id, token_hash
     from staff_invites
     where profile_id = $1 and status = 'pending'
     limit 1`,
    [input.profileId]
  )

  let inviteId = pendingRows[0]?.id ?? null
  let token: string

  if (inviteId) {
    token = buildStaffInviteToken(inviteId)
    await db.query(
      `update staff_invites
       set token_hash = $2,
           email = $3,
           last_sent_at = now(),
           updated_at = now()
       where id = $1`,
      [inviteId, hashToken(token), email]
    )
  } else {
    inviteId = randomUUID()
    token = buildStaffInviteToken(inviteId)
    await db.query(
      `insert into staff_invites (
         id, profile_id, email, token_hash, status, created_by, last_sent_at
       ) values (
         $1, $2, $3, $4, 'pending', $5, now()
       )`,
      [inviteId, input.profileId, email, hashToken(token), input.createdBy]
    )
  }

  return {
    inviteId,
    token,
    invitePath: buildStaffInvitePath(token),
    inviteUrl: buildStaffInviteUrl(token),
  }
}

export async function revokeStaffInvite(profileId: string) {
  const db = await getRequestDb()
  const { rowCount } = await db.query(
    `update staff_invites
     set status = 'revoked',
         revoked_at = now(),
         updated_at = now()
     where profile_id = $1 and status = 'pending'`,
    [profileId]
  )
  return rowCount ?? 0
}

export async function setSalesmanDisabled(profileId: string, disabled: boolean) {
  const db = await getRequestDb()
  const { rows } = await db.query<{ disabled_at: string | null }>(
    `update profiles
     set disabled_at = case when $2 then now() else null end,
         updated_at = now()
     where id = $1 and role = 'salesman'
     returning disabled_at::text`,
    [profileId, disabled]
  )

  if (!rows[0]) {
    throw new RouteError(404, 'staff_not_found', 'Salesman profile not found')
  }

  return rows[0]
}

export async function validateStaffInviteToken(token: string) {
  const trimmedToken = token.trim()
  const [inviteId, signature] = trimmedToken.split('.', 2)

  if (!inviteId || !signature) {
    return { status: 'invalid' as const }
  }

  const expectedToken = buildStaffInviteToken(inviteId)
  if (expectedToken !== trimmedToken) {
    return { status: 'invalid' as const }
  }

  const db = await getRequestDb()
  const { rows } = await db.query<{
    id: string
    profile_id: string
    email: string
    status: 'pending' | 'accepted' | 'revoked'
    token_hash: string
    revoked_at: string | null
    accepted_at: string | null
    disabled_at: string | null
    contact_name: string | null
    business_name: string | null
  }>(
    `select
        si.id,
        si.profile_id,
        si.email,
        si.status,
        si.token_hash,
        si.revoked_at::text,
        si.accepted_at::text,
        p.disabled_at::text,
        p.contact_name,
        p.business_name
      from staff_invites si
      inner join profiles p on p.id = si.profile_id
      where si.id = $1 and p.role = 'salesman'
      limit 1`,
    [inviteId]
  )

  const invite = rows[0]
  if (!invite) {
    return { status: 'invalid' as const }
  }

  if (invite.token_hash !== hashToken(trimmedToken)) {
    return { status: 'invalid' as const }
  }

  if (invite.status === 'revoked' || invite.revoked_at) {
    return { status: 'revoked' as const, invite }
  }

  if (invite.status === 'accepted' || invite.accepted_at) {
    return { status: 'accepted' as const, invite }
  }

  if (invite.disabled_at) {
    return { status: 'disabled' as const, invite }
  }

  return { status: 'pending' as const, invite }
}

export async function triggerStaffInvitePasswordSetup(token: string) {
  const validation = await validateStaffInviteToken(token)

  if (validation.status !== 'pending') {
    return validation
  }

  const invite = validation.invite
  const displayName = invite.contact_name?.trim() || invite.business_name?.trim() || invite.email
  const authUserId = await ensureNeonAuthUser({
    email: invite.email,
    name: displayName,
  })

  await getAuth().requestPasswordReset({
    email: invite.email,
    redirectTo: buildPasswordResetCallbackUrl(),
  })

  const db = await getRequestDb()
  await db.query(
    `update profiles
     set auth_user_id = coalesce(auth_user_id, $2),
         updated_at = now()
     where id = $1`,
    [invite.profile_id, authUserId]
  )

  return {
    status: 'pending' as const,
    invite,
    authUserId,
  }
}

export async function markPendingStaffInvitesAccepted(input: {
  profileId: string
  email: string | null
  authUserId: string
}) {
  const email = input.email ? normalizeEmail(input.email) : null
  const db = await getRequestDb()

  await db.query(
    `update profiles
     set auth_user_id = coalesce(auth_user_id, $2),
         updated_at = now()
     where id = $1`,
    [input.profileId, input.authUserId]
  )

  if (!email) {
    return
  }

  await db.query(
    `update staff_invites
     set status = 'accepted',
         accepted_at = coalesce(accepted_at, now()),
         updated_at = now()
     where profile_id = $1
       and lower(email) = $2
       and status = 'pending'`,
    [input.profileId, email]
  )
}
