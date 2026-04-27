import type { DbFacade } from '@/lib/server/db'

export interface CreateCounts {
  customers: number
  orders: number
  products: number
  deals: number
}

/** Single-query batch count for the homepage Create grid. Counts use
 *  the same filters the per-domain resolvers use:
 *   - customers: profiles where role = 'customer'
 *   - orders: every row in `orders` (drafts + submitted + delivered)
 *   - products: products that show on the customer catalog (no
 *     customer_id, not discontinued)
 *   - deals: announcements where kind = 'deal' AND is_active.
 *  Cheap (4 indexed counts).
 */
export async function getCreateCounts(db: DbFacade): Promise<CreateCounts> {
  const { rows } = await db.query<{
    customers: number
    orders: number
    products: number
    deals: number
  }>(
    `select
       (select count(*)::int from profiles where role = 'customer') as customers,
       (select count(*)::int from orders) as orders,
       (select count(*)::int from products
         where customer_id is null and is_discontinued = false) as products,
       (select count(*)::int from announcements
         where kind = 'deal' and is_active = true) as deals`,
  )
  const row = rows[0]
  return {
    customers: row?.customers ?? 0,
    orders: row?.orders ?? 0,
    products: row?.products ?? 0,
    deals: row?.deals ?? 0,
  }
}
