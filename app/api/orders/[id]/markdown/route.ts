import { z } from 'zod'
import { getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { buildOrderMarkdown, type OrderMarkdownItem } from '@/lib/share/order-markdown'
import type { OrderStatus } from '@/lib/types'
import { getProductDisplayName, getProductPackLabel } from '@/lib/utils'

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

    const [{ rows: customerRows }, { rows: itemRows }] = await Promise.all([
      context.order.customer_id
        ? db.query<{
            business_name: string | null
            contact_name: string | null
            email: string | null
            phone: string | null
          }>(
            `select business_name, contact_name, email, phone
             from profiles
             where id = $1
             limit 1`,
            [context.order.customer_id]
          )
        : Promise.resolve({ rows: [] }),
      db.query<{
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
      ),
    ])

    const productIds = itemRows
      .map((item) => item.product_id)
      .filter((value): value is string => !!value)
    const palletIds = itemRows
      .map((item) => item.pallet_deal_id)
      .filter((value): value is string => !!value)

    const [productsResponse, palletsResponse, brandsResponse] = await Promise.all([
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

    const items: OrderMarkdownItem[] = itemRows.map((item) => {
      if (item.product_id) {
        const product = productMap.get(item.product_id)
        const brandName = product?.brand_id ? brandMap.get(product.brand_id) ?? null : null
        return {
          label: product ? getProductDisplayName(product, brandName) : 'Unknown Product',
          pack: product ? getProductPackLabel(product) ?? null : null,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price ?? 0),
          lineTotal: Number(item.line_total ?? 0),
        }
      }
      const pallet = item.pallet_deal_id ? palletMap.get(item.pallet_deal_id) : null
      return {
        label: pallet?.title ?? 'Unknown Pallet',
        pack: pallet?.description ?? 'Pallet deal',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price ?? 0),
        lineTotal: Number(item.line_total ?? 0),
      }
    })

    const customer = customerRows[0] ?? null
    const customerName =
      customer?.business_name || customer?.contact_name || 'Unknown customer'

    const markdown = buildOrderMarkdown({
      orderId: context.order.id,
      customerName,
      customerEmail: customer?.email ?? null,
      customerPhone: customer?.phone ?? null,
      deliveryDate: toIsoDate(context.order.delivery_date),
      status: asOrderStatus(context.order.status),
      submittedAt: toIsoString(context.order.submitted_at),
      total: Number(context.order.total ?? 0),
      itemCount: context.order.item_count ?? items.length,
      items,
    })

    return new Response(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `inline; filename="order-${context.order.id}.md"`,
        'x-request-id': requestId,
      },
    })
  } catch (error) {
    logApiEvent(requestId, 'order_markdown_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'draft'
}

function toIsoDate(value: string | Date): string {
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return value
}

function toIsoString(value: string | Date | null): string | null {
  if (value === null) return null
  if (value instanceof Date) return value.toISOString()
  return value
}
