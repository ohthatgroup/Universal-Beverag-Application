import { createAdminClient } from '@/lib/supabase/admin'
import { requirePortalOrderAccess, requirePortalToken } from '@/lib/server/customer-order-access'

/**
 * DELETE /api/portal/orders/[id]/items/all
 * Reset all items on a draft order.
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

    if (order.status !== 'draft') {
      return Response.json(
        { error: { code: 'order_not_draft', message: 'Can only modify draft orders' } },
        { status: 409 }
      )
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('order_items')
      .delete()
      .eq('order_id', order.id)

    if (error) throw error

    return Response.json({ data: { deleted: true } })
  } catch (error) {
    if (error instanceof Response) return error
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: { code: 'internal_error', message } }, { status: 500 })
  }
}
