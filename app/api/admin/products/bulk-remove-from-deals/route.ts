import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const schema = z.object({ productIds: z.array(z.string().uuid()).min(1) })

/**
 * Strip a set of product ids from every announcement's product slots
 * (`product_ids`, `cta_target_product_ids`, scalar `product_id`,
 * scalar `cta_target_product_id`). Used by the
 * `discontinued-in-active-deals` prompt drawer.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, schema)
    const db = await getRequestDb()

    await db.query(
      `update announcements
          set product_ids = coalesce(
                              (
                                select array_agg(elem)
                                  from unnest(product_ids) elem
                                 where elem <> all($1::uuid[])
                              ),
                              '{}'::uuid[]
                            ),
              cta_target_product_ids = coalesce(
                              (
                                select array_agg(elem)
                                  from unnest(cta_target_product_ids) elem
                                 where elem <> all($1::uuid[])
                              ),
                              '{}'::uuid[]
                            ),
              product_id = case
                             when product_id = any($1::uuid[]) then null
                             else product_id
                           end,
              cta_target_product_id = case
                             when cta_target_product_id = any($1::uuid[]) then null
                             else cta_target_product_id
                           end
        where product_ids && $1::uuid[]
           or cta_target_product_ids && $1::uuid[]
           or product_id = any($1::uuid[])
           or cta_target_product_id = any($1::uuid[])`,
      [payload.productIds],
    )

    return apiOk({ removed: payload.productIds.length }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
