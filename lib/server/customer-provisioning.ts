import { randomBytes, randomUUID } from 'crypto'
import { RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { ensureNeonAuthUser } from '@/lib/server/neon-auth-users'

type ProvisionedCustomer = {
  id: string
  business_name: string | null
  email: string | null
  access_token: string | null
  auth_user_id: string | null
}

export async function provisionCustomerProfile(input: {
  businessName: string
  email: string
}) {
  const businessName = input.businessName.trim()
  const email = input.email.trim().toLowerCase()

  if (!businessName) {
    throw new RouteError(400, 'validation_error', 'Business name is required')
  }
  if (!email) {
    throw new RouteError(400, 'validation_error', 'Email is required for customer provisioning')
  }

  const db = await getRequestDb()

  const { rows: existingProfiles } = await db.query<{ id: string }>(
    `select id from profiles where lower(email) = lower($1) limit 1`,
    [email]
  )
  if (existingProfiles[0]) {
    throw new RouteError(409, 'customer_email_exists', 'A customer with that email already exists')
  }

  const authUserId = await ensureNeonAuthUser({
    email,
    name: businessName,
  })

  const { rows: linkedProfiles } = await db.query<{ id: string }>(
    `select id from profiles where auth_user_id = $1 limit 1`,
    [authUserId]
  )
  if (linkedProfiles[0]) {
    throw new RouteError(
      409,
      'auth_user_already_linked',
      'This Neon Auth user is already linked to another customer profile'
    )
  }

  const customerId = randomUUID()
  const accessToken = randomBytes(16).toString('hex')

  const { rows } = await db.query<ProvisionedCustomer>(
    `insert into profiles (
      id, auth_user_id, role, business_name, email, contact_name, phone, show_prices, custom_pricing, default_group, access_token
    ) values (
      $1, $2, 'customer', $3, $4, null, null, true, false, 'brand', $5
    )
    returning id, business_name, email, access_token, auth_user_id`,
    [customerId, authUserId, businessName, email, accessToken]
  )

  const profile = rows[0]
  if (!profile) {
    throw new Error('Failed to create customer profile')
  }

  return profile
}
