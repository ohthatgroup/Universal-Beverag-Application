import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const updateBrandSchema = z.object({
  name: z.string().trim().min(1).optional(),
  logoUrl: z.string().url().nullable().optional(),
})

export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, updateBrandSchema)
    const admin = createAdminClient()

    const patch: {
      name?: string
      logo_url?: string | null
    } = {}
    if (payload.name !== undefined) patch.name = payload.name
    if (payload.logoUrl !== undefined) patch.logo_url = payload.logoUrl

    const { data: updated, error: updateError } = await admin
      .from('brands')
      .update(patch)
      .eq('id', id)
      .select('id,name,logo_url,sort_order')
      .single()

    if (updateError) {
      throw updateError
    }

    return apiOk(
      {
        id: updated.id,
        name: updated.name,
        logoUrl: updated.logo_url,
        sortOrder: updated.sort_order,
      },
      200,
      requestId
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const admin = createAdminClient()

    const { error: unlinkError } = await admin
      .from('products')
      .update({ brand_id: null })
      .eq('brand_id', id)

    if (unlinkError) {
      throw unlinkError
    }

    const { error: deleteError } = await admin
      .from('brands')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
