import { z } from 'zod'
import { getRequestId, logApiEvent, toErrorResponse } from '@/lib/server/api'
import { requireOrderAccess } from '@/lib/server/auth'
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

    const { data: items, error: itemsError } = await context.supabase
      .from('order_items')
      .select('product_id,pallet_deal_id,quantity,unit_price,line_total')
      .eq('order_id', context.order.id)
      .gt('quantity', 0)
      .order('id', { ascending: true })

    if (itemsError) {
      throw itemsError
    }

    const itemRows = items ?? []
    const productIds = itemRows
      .map((item) => item.product_id)
      .filter((idValue): idValue is string => !!idValue)

    const palletIds = itemRows
      .map((item) => item.pallet_deal_id)
      .filter((idValue): idValue is string => !!idValue)

    const [
      { data: products, error: productsError },
      { data: pallets, error: palletsError },
      { data: brands, error: brandsError },
    ] =
      await Promise.all([
        productIds.length
          ? context.supabase
              .from('products')
              .select('id,title,brand_id,pack_details,pack_count,size_value,size_uom')
              .in('id', productIds)
          : Promise.resolve({ data: [], error: null }),
        palletIds.length
          ? context.supabase
              .from('pallet_deals')
              .select('id,title,description')
              .in('id', palletIds)
          : Promise.resolve({ data: [], error: null }),
        context.supabase.from('brands').select('id,name'),
      ])

    if (productsError) {
      throw productsError
    }

    if (palletsError) {
      throw palletsError
    }
    if (brandsError) {
      throw brandsError
    }

    const productMap = new Map((products ?? []).map((product) => [product.id, product] as const))
    const palletMap = new Map((pallets ?? []).map((pallet) => [pallet.id, pallet] as const))
    const brandMap = new Map((brands ?? []).map((brand) => [brand.id, brand.name] as const))

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
