import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken, type CustomerContext } from '@/lib/server/customer-auth'
import type { Database } from '@/lib/types'

type OrderRow = Database['public']['Tables']['orders']['Row']

export interface PortalOrderContext extends CustomerContext {
  order: OrderRow
}

/**
 * Validate a portal token + order ownership for portal API routes.
 * Returns the customer context plus the order row.
 * Throws a Response (401/404) on failure - callers should catch in try/catch.
 */
export async function requirePortalOrderAccess(
  orderId: string,
  token: string
): Promise<PortalOrderContext> {
  const customerContext = await resolveCustomerToken(token)
  const db = await getRequestDb()
  const orderResult = await db.query<OrderRow>('select * from orders where id = $1 limit 1', [orderId])
  const order = orderResult.rows[0]

  if (!order) {
    throw new Response(JSON.stringify({ error: { code: 'order_not_found', message: 'Order not found' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (order.customer_id !== customerContext.customerId) {
    throw new Response(JSON.stringify({ error: { code: 'forbidden', message: 'You cannot access this order' } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return {
    ...customerContext,
    order,
  }
}

/**
 * Extract the portal token from X-Customer-Token header or query parameter.
 * Returns null if not present.
 */
export function extractPortalToken(request: Request): string | null {
  const headerToken = request.headers.get('X-Customer-Token')
  if (headerToken) return headerToken

  const url = new URL(request.url)
  return url.searchParams.get('token')
}

/**
 * Require portal token from request headers/query.
 * Throws 401 Response if missing.
 */
export function requirePortalToken(request: Request): string {
  const token = extractPortalToken(request)
  if (!token) {
    throw new Response(
      JSON.stringify({ error: { code: 'unauthorized', message: 'Missing X-Customer-Token header' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return token
}
