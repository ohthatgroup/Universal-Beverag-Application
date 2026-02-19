import { createAdminClient } from '@/lib/supabase/admin'
import { requirePortalOrderAccess, extractPortalToken } from '@/lib/server/customer-order-access'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { buildCsv, getProductPackLabel } from '@/lib/utils'

/**
 * GET /api/portal/orders/[id]/csv?token=...
 * Download CSV for a customer order.
 * Auth: token query param (GET requests can't use headers from <a> tags)
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractPortalToken(request)
    if (!token) {
      return Response.json(
        { error: { code: 'unauthorized', message: 'Missing token parameter' } },
        { status: 401 }
      )
    }

    const { id } = await routeContext.params

    // Verify token + order ownership
    await resolveCustomerToken(token)
    const { order } = await requirePortalOrderAccess(id, token)

    const admin = createAdminClient()

    const { data: items, error: itemsError } = await admin
      .from('order_items')
      .select('product_id,pallet_deal_id,quantity,unit_price,line_total')
      .eq('order_id', order.id)
      .gt('quantity', 0)
      .order('id', { ascending: true })

    if (itemsError) throw itemsError

    const itemRows = items ?? []
    const productIds = itemRows
      .map((item) => item.product_id)
      .filter((idValue): idValue is string => !!idValue)
    const palletIds = itemRows
      .map((item) => item.pallet_deal_id)
      .filter((idValue): idValue is string => !!idValue)

    const [{ data: products, error: productsError }, { data: pallets, error: palletsError }] =
      await Promise.all([
        productIds.length
          ? admin.from('products').select('id,title,pack_details,pack_count,size_value,size_uom').in('id', productIds)
          : Promise.resolve({ data: [], error: null }),
        palletIds.length
          ? admin.from('pallet_deals').select('id,title,description').in('id', palletIds)
          : Promise.resolve({ data: [], error: null }),
      ])

    if (productsError) throw productsError
    if (palletsError) throw palletsError

    const productMap = new Map((products ?? []).map((p) => [p.id, p] as const))
    const palletMap = new Map((pallets ?? []).map((p) => [p.id, p] as const))

    const rows = itemRows.map((item) => {
      if (item.product_id) {
        const product = productMap.get(item.product_id)
        return {
          Product: product?.title ?? 'Unknown Product',
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
        'Content-Disposition': `attachment; filename="order-${order.id}.csv"`,
      },
    })
  } catch (error) {
    if (error instanceof Response) return error
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: { code: 'internal_error', message } }, { status: 500 })
  }
}
