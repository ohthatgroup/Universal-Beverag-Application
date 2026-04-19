import type { DbFacade } from '@/lib/server/db'

export interface Usual {
  productId: string
  typicalQty: number
  reason: 'frequent' | 'pinned'
}

interface FrequencyRow {
  product_id: string
  typical_qty: number
  order_count: number
}

interface PinnedRow {
  product_id: string
}

const USUALS_WINDOW = 5
const USUALS_LIMIT = 20

export async function getUsualsForCustomer(
  db: DbFacade,
  customerId: string
): Promise<Usual[]> {
  const [frequency, pinned] = await Promise.all([
    db.query<FrequencyRow>(
      `select
         oi.product_id,
         count(distinct oi.order_id)::int as order_count,
         greatest(round(avg(oi.quantity))::int, 1) as typical_qty
       from order_items oi
       join orders o on o.id = oi.order_id
       where o.customer_id = $1
         and o.status in ('submitted', 'delivered')
         and oi.product_id is not null
         and oi.quantity > 0
         and o.id in (
           select id from orders
            where customer_id = $1
              and status in ('submitted', 'delivered')
            order by submitted_at desc nulls last
            limit $2
         )
       group by oi.product_id
       order by order_count desc, sum(oi.quantity) desc
       limit $3`,
      [customerId, USUALS_WINDOW, USUALS_LIMIT]
    ),
    db.query<PinnedRow>(
      `select cp.product_id
         from customer_products cp
         join products p on p.id = cp.product_id
        where cp.customer_id = $1
          and cp.is_usual = true
          and cp.excluded = false
          and p.is_discontinued = false`,
      [customerId]
    ),
  ])

  const seen = new Set<string>()
  const usuals: Usual[] = []

  for (const row of pinned.rows) {
    if (seen.has(row.product_id)) continue
    seen.add(row.product_id)
    usuals.push({ productId: row.product_id, typicalQty: 1, reason: 'pinned' })
  }

  for (const row of frequency.rows) {
    if (seen.has(row.product_id)) continue
    seen.add(row.product_id)
    usuals.push({
      productId: row.product_id,
      typicalQty: row.typical_qty,
      reason: 'frequent',
    })
  }

  return usuals.slice(0, USUALS_LIMIT)
}
