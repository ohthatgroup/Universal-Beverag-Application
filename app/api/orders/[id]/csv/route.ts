import { z } from 'zod'
import { getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { buildCsv, getProductDisplayName, getProductPackLabel } from '@/lib/utils'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const context = await requireOrderAccess(id)
    const db = await getRequestDb()

    const { rows: itemRows } = await db.query<{
      product_id: string | null
      pallet_deal_id: string | null
      quantity: number
      unit_price: number
      line_total: number | null
    }>(
      `select product_id, pallet_deal_id, quantity, unit_price, line_total
       from order_items
       where order_id = $1 and quantity > 0
       order by id asc`,
      [context.order.id]
    )
    const productIds = itemRows
      .map((item) => item.product_id)
      .filter((idValue): idValue is string => !!idValue)

    const palletIds = itemRows
      .map((item) => item.pallet_deal_id)
      .filter((idValue): idValue is string => !!idValue)

    const [productsResponse, palletsResponse, brandsResponse] =
      await Promise.all([
        productIds.length
          ? db.query<{
              id: string
              title: string
              brand_id: string | null
              pack_details: string | null
              pack_count: number | null
              size_value: number | null
              size_uom: string | null
            }>(
              `select id, title, brand_id, pack_details, pack_count, size_value, size_uom
               from products
               where id = any($1::uuid[])`,
              [productIds]
            )
          : Promise.resolve({ rows: [] }),
        palletIds.length
          ? db.query<{ id: string; title: string; description: string | null }>(
              `select id, title, description from pallet_deals where id = any($1::uuid[])`,
              [palletIds]
            )
          : Promise.resolve({ rows: [] }),
        db.query<{ id: string; name: string }>('select id, name from brands'),
      ])
    const productMap = new Map(productsResponse.rows.map((product) => [product.id, product] as const))
    const palletMap = new Map(palletsResponse.rows.map((pallet) => [pallet.id, pallet] as const))
    const brandMap = new Map(brandsResponse.rows.map((brand) => [brand.id, brand.name] as const))

    const rows = itemRows.map((item) => {
      if (item.product_id) {
        const product = productMap.get(item.product_id)
        const brandName = product?.brand_id ? brandMap.get(product.brand_id) ?? null : null
        return {
          Product: product ? getProductDisplayName(product, brandName) : 'Unknown Product',
          'Pack Details': product ? getProductPackLabel(product) ?? '' : '',
          Quantity: item.quantity,
          'Unit Price': Number(item.unit_price).toFixed(2),
          'Line Total': Number(item.line_total ?? 0).toFixed(2),
        }
      }

      const pallet = item.pallet_deal_id ? palletMap.get(item.pallet_deal_id) : null
      return {
        Product: pallet?.title ?? 'Unknown Pallet',
        'Pack Details': pallet?.description ?? 'Pallet deal',
        Quantity: item.quantity,
        'Unit Price': Number(item.unit_price).toFixed(2),
        'Line Total': Number(item.line_total ?? 0).toFixed(2),
      }
    })

    const csv = buildCsv(rows, ['Product', 'Pack Details', 'Quantity', 'Unit Price', 'Line Total'])

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="order-${context.order.id}.csv"`,
        'x-request-id': requestId,
      },
    })
  } catch (error) {
    logApiEvent(requestId, 'order_csv_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
