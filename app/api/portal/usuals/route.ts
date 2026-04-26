import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { requirePortalToken } from '@/lib/server/customer-order-access'
import { getRequestDb } from '@/lib/server/db'

const setUsualSchema = z.object({
  productId: z.string().uuid(),
  isUsual: z.boolean(),
})

/**
 * PATCH /api/portal/usuals
 * Body: { productId, isUsual }
 * Auth: X-Customer-Token header.
 *
 * Upserts customer_products with the new is_usual flag. Existing
 * `excluded` and `custom_price` values are preserved when the row exists;
 * otherwise the row is inserted with defaults (excluded = false,
 * custom_price = null).
 *
 * Returns 200 with `{ productId, isUsual }` on success.
 */
export async function PATCH(request: Request) {
  const requestId = getRequestId(request)
  try {
    const token = requirePortalToken(request)
    const { customerId } = await resolveCustomerToken(token)
    const payload = await parseBody(request, setUsualSchema)
    const db = await getRequestDb()

    // Verify the product exists and is visible to this customer.
    const { rows: productRows } = await db.query<{ id: string }>(
      `select id
         from products
        where id = $1
          and is_discontinued = false
          and (customer_id is null or customer_id = $2)
        limit 1`,
      [payload.productId, customerId],
    )

    if (!productRows[0]) {
      return toErrorResponse(
        new Response(
          JSON.stringify({
            error: {
              code: 'not_found',
              message: 'Product not found or not available to this customer.',
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        ),
        requestId,
      )
    }

    await db.query(
      `insert into customer_products (customer_id, product_id, excluded, custom_price, is_usual)
       values ($1, $2, false, null, $3)
       on conflict (customer_id, product_id)
       do update set is_usual = EXCLUDED.is_usual`,
      [customerId, payload.productId, payload.isUsual],
    )

    return apiOk(
      { productId: payload.productId, isUsual: payload.isUsual },
      200,
      requestId,
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
