import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const nullableString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional()

const tagArray = z
  .array(z.string())
  .transform((values) =>
    Array.from(
      new Set(
        values
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      )
    )
  )
  .optional()

const updateCustomerSchema = z.object({
  businessName: nullableString,
  contactName: nullableString,
  email: nullableString,
  phone: nullableString,
  address: nullableString,
  city: nullableString,
  state: nullableString,
  zip: nullableString,
  tags: tagArray,
  location: nullableString,
  showPrices: z.boolean().optional(),
  customPricing: z.boolean().optional(),
  defaultGroup: z.enum(['brand', 'size']).optional(),
  customerGroupId: z.string().uuid().nullable().optional(),
})

export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, updateCustomerSchema)
    const db = await getRequestDb()

    const existing = await db.query<{
      id: string
      business_name: string | null
      contact_name: string | null
      email: string | null
      phone: string | null
      address: string | null
      city: string | null
      state: string | null
      zip: string | null
      tags: string[]
      location: string | null
      show_prices: boolean
      custom_pricing: boolean
      default_group: string
      customer_group_id: string | null
    }>(
      `select id, business_name, contact_name, email, phone, address, city, state, zip,
              tags, location, show_prices, custom_pricing, default_group, customer_group_id
       from profiles where id = $1 and role = 'customer' limit 1`,
      [id]
    )
    const current = existing.rows[0]
    if (!current) throw new Error('Customer not found')

    const next = {
      business_name: payload.businessName ?? current.business_name,
      contact_name: payload.contactName ?? current.contact_name,
      email: payload.email ?? current.email,
      phone: payload.phone ?? current.phone,
      address: payload.address ?? current.address,
      city: payload.city ?? current.city,
      state: payload.state ?? current.state,
      zip: payload.zip ?? current.zip,
      tags: payload.tags ?? current.tags,
      location: payload.location ?? current.location,
      show_prices: payload.showPrices ?? current.show_prices,
      custom_pricing: payload.customPricing ?? current.custom_pricing,
      default_group: payload.defaultGroup ?? current.default_group,
      customer_group_id:
        'customerGroupId' in payload
          ? payload.customerGroupId ?? null
          : current.customer_group_id,
    }

    // Distinguish "caller sent null to clear" from "caller omitted field".
    // Zod transforms empty string to null, so if the field is present in the
    // parsed payload (even if null), we use the parsed value directly.
    if ('businessName' in payload) next.business_name = payload.businessName ?? null
    if ('contactName' in payload) next.contact_name = payload.contactName ?? null
    if ('email' in payload) next.email = payload.email ?? null
    if ('phone' in payload) next.phone = payload.phone ?? null
    if ('address' in payload) next.address = payload.address ?? null
    if ('city' in payload) next.city = payload.city ?? null
    if ('state' in payload) next.state = payload.state ?? null
    if ('zip' in payload) next.zip = payload.zip ?? null
    if ('location' in payload) next.location = payload.location ?? null

    const { rows } = await db.query<{
      id: string
      show_prices: boolean
      custom_pricing: boolean
      default_group: string
    }>(
      `update profiles
       set business_name = $2,
           contact_name = $3,
           email = $4,
           phone = $5,
           address = $6,
           city = $7,
           state = $8,
           zip = $9,
           tags = $10,
           location = $11,
           show_prices = $12,
           custom_pricing = $13,
           default_group = $14,
           customer_group_id = $15,
           updated_at = now()
       where id = $1 and role = 'customer'
       returning id, show_prices, custom_pricing, default_group`,
      [
        id,
        next.business_name,
        next.contact_name,
        next.email,
        next.phone,
        next.address,
        next.city,
        next.state,
        next.zip,
        next.tags,
        next.location,
        next.show_prices,
        next.custom_pricing,
        next.default_group,
        next.customer_group_id,
      ]
    )
    const updated = rows[0]
    if (!updated) throw new Error('Customer not found')

    return apiOk(
      {
        id: updated.id,
        showPrices: updated.show_prices,
        customPricing: updated.custom_pricing,
        defaultGroup: updated.default_group,
      },
      200,
      requestId
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const db = await getRequestDb()
    await db.query(`delete from profiles where id = $1 and role = 'customer'`, [id])
    return apiOk({ id }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
