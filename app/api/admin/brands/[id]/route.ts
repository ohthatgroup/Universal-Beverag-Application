import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const updateBrandSchema = z.object({
  name: z.string().trim().min(1).optional(),
  logoUrl: z.string().trim().min(1).nullable().optional(),
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
    const db = await getRequestDb()

    const existing = await db.query<{ id: string; name: string; logo_url: string | null; sort_order: number }>(
      'select id, name, logo_url, sort_order from brands where id = $1 limit 1',
      [id]
    )
    const current = existing.rows[0]
    if (!current) throw new Error('Brand not found')

    const nextName = payload.name ?? current.name
    const nextLogo = 'logoUrl' in payload ? payload.logoUrl ?? null : current.logo_url

    const { rows } = await db.query<{
      id: string
      name: string
      logo_url: string | null
      sort_order: number
    }>(
      `update brands
       set name = $2,
           logo_url = $3
       where id = $1
       returning id, name, logo_url, sort_order`,
      [id, nextName, nextLogo]
    )
    const updated = rows[0]
    if (!updated) throw new Error('Brand not found')

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
    const db = await getRequestDb()
    await db.transaction(async (client) => {
      await client.query('update products set brand_id = null where brand_id = $1', [id])
      await client.query('delete from brands where id = $1', [id])
    })

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
