import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { applyPresetSchema } from '@/lib/server/schemas'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id: presetId } = paramsSchema.parse(await routeContext.params)
    const { customerId } = await parseBody(request, applyPresetSchema)
    const db = await getRequestDb()

    await db.transaction(async (client) => {
      const preset = await client.query<{ id: string }>(
        'select id from presets where id = $1 limit 1',
        [presetId]
      )
      if (!preset.rows[0]) {
        throw new RouteError(404, 'preset_not_found', 'Preset not found')
      }

      const customer = await client.query<{ id: string }>(
        `select id from profiles where id = $1 and role = 'customer' limit 1`,
        [customerId]
      )
      if (!customer.rows[0]) {
        throw new RouteError(404, 'customer_not_found', 'Customer not found')
      }

      // Brands — replace wholesale
      await client.query('delete from customer_brands where customer_id = $1', [customerId])
      await client.query(
        `insert into customer_brands (customer_id, brand_id, is_hidden, is_pinned)
         select $1, brand_id, is_hidden, is_pinned
         from preset_brand_rules
         where preset_id = $2`,
        [customerId, presetId]
      )

      // Sizes — replace wholesale
      await client.query('delete from customer_sizes where customer_id = $1', [customerId])
      await client.query(
        `insert into customer_sizes (customer_id, size_key, is_hidden)
         select $1, size_key, is_hidden
         from preset_size_rules
         where preset_id = $2`,
        [customerId, presetId]
      )

      // Product overrides — clear existing hide/pin flags, then apply preset rules.
      // Favorites (is_usual) and custom prices stay untouched.
      await client.query(
        `update customer_products
         set is_hidden = false, is_pinned = false
         where customer_id = $1`,
        [customerId]
      )
      await client.query(
        `insert into customer_products (customer_id, product_id, is_hidden, is_pinned)
         select $1, product_id, is_hidden, is_pinned
         from preset_product_rules
         where preset_id = $2
         on conflict (customer_id, product_id) do update
           set is_hidden = excluded.is_hidden,
               is_pinned = excluded.is_pinned`,
        [customerId, presetId]
      )
    })

    return apiOk({ applied: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
