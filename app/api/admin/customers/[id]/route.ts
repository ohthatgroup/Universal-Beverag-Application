import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const updateCustomerSchema = z.object({
  showPrices: z.boolean().optional(),
  customPricing: z.boolean().optional(),
  defaultGroup: z.enum(['brand', 'size']).optional(),
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
      show_prices: boolean
      custom_pricing: boolean
      default_group: string
    }>(
      "select id, show_prices, custom_pricing, default_group from profiles where id = $1 and role = 'customer' limit 1",
      [id]
    )
    const current = existing.rows[0]
    if (!current) throw new Error('Customer not found')

    const nextShowPrices = payload.showPrices ?? current.show_prices
    const nextCustomPricing = payload.customPricing ?? current.custom_pricing
    const nextDefaultGroup = payload.defaultGroup ?? current.default_group

    const { rows } = await db.query<{
      id: string
      show_prices: boolean
      custom_pricing: boolean
      default_group: string
    }>(
      `update profiles
       set show_prices = $2,
           custom_pricing = $3,
           default_group = $4
       where id = $1 and role = 'customer'
       returning id, show_prices, custom_pricing, default_group`,
      [id, nextShowPrices, nextCustomPricing, nextDefaultGroup]
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
