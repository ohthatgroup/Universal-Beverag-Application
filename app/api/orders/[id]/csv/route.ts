import { z } from 'zod'
import { getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess } from '@/lib/server/auth'
import { buildCsv } from '@/lib/utils'

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

    const { data: items, error: itemsError } = await context.supabase
      .from('order_items')
      .select('product_id,pallet_deal_id,quantity,unit_price,line_total')
      .eq('order_id', context.order.id)
      .gt('quantity', 0)
      .order('id', { ascending: true })

    if (itemsError) {
      throw itemsError
    }

    const productIds = ((items ?? []) as any[])
      .map((item) => item.product_id)
      .filter((idValue): idValue is string => !!idValue)

    const palletIds = ((items ?? []) as any[])
      .map((item) => item.pallet_deal_id)
      .filter((idValue): idValue is string => !!idValue)

    const [{ data: products, error: productsError }, { data: pallets, error: palletsError }] =
      await Promise.all([
        productIds.length
          ? context.supabase
              .from('products')
              .select('id,title,pack_details')
              .in('id', productIds)
          : Promise.resolve({ data: [], error: null }),
        palletIds.length
          ? context.supabase
              .from('pallet_deals')
              .select('id,title,description')
              .in('id', palletIds)
          : Promise.resolve({ data: [], error: null }),
      ])

    if (productsError) {
      throw productsError
    }

    if (palletsError) {
      throw palletsError
    }

    const productMap = new Map<string, any>(((products ?? []) as any[]).map((product) => [product.id, product]))
    const palletMap = new Map<string, any>(((pallets ?? []) as any[]).map((pallet) => [pallet.id, pallet]))

    const rows = ((items ?? []) as any[]).map((item) => {
      if (item.product_id) {
        const product = productMap.get(item.product_id)
        return {
          Product: product?.title ?? 'Unknown Product',
          'Pack Details': product?.pack_details ?? '',
          Quantity: item.quantity,
          'Unit Price': Number(item.unit_price).toFixed(2),
          'Line Total': Number(item.line_total).toFixed(2),
        }
      }

      const pallet = item.pallet_deal_id ? palletMap.get(item.pallet_deal_id) : null
      return {
        Product: pallet?.title ?? 'Unknown Pallet',
        'Pack Details': pallet?.description ?? 'Pallet deal',
        Quantity: item.quantity,
        'Unit Price': Number(item.unit_price).toFixed(2),
        'Line Total': Number(item.line_total).toFixed(2),
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
