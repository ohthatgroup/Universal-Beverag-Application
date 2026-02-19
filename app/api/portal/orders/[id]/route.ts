import { createAdminClient } from '@/lib/supabase/admin'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'

/**
 * DELETE /api/portal/orders/[id]
 * Delete a customer order (items are deleted first due to FK constraint).
 * Auth: X-Customer-Token header
 */
export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const token = requirePortalToken(request)
    const { id } = await routeContext.params
    const { order } = await requirePortalOrderAccess(id, token)

    const admin = createAdminClient()

    // Delete order items first (foreign key constraint)
    const { error: itemsError } = await admin
      .from('order_items')
      .delete()
      .eq('order_id', order.id)

    if (itemsError) throw itemsError

    // Delete the order
    const { error: orderError } = await admin
      .from('orders')
      .delete()
      .eq('id', order.id)

    if (orderError) throw orderError

    return Response.json({ data: { deleted: true } })
  } catch (error) {
    if (error instanceof Response) return error
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: { code: 'internal_error', message } }, { status: 500 })
  }
}
