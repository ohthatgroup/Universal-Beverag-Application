import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'

const createBrandSchema = z.object({
  name: z.string().trim().min(1),
  logoUrl: z.string().url().nullable().optional(),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, createBrandSchema)
    const db = await getRequestDb()
    const { rows } = await db.query<{
      id: string
      name: string
      logo_url: string | null
      sort_order: number
    }>(
      `insert into brands (name, logo_url, sort_order)
       values ($1, $2, coalesce((select max(sort_order) from brands), -1) + 1)
       returning id, name, logo_url, sort_order`,
      [payload.name, payload.logoUrl ?? null]
    )
    const created = rows[0]
    if (!created) throw new Error('Failed to create brand')

    return apiOk(
      {
        id: created.id,
        name: created.name,
        logoUrl: created.logo_url,
        sortOrder: created.sort_order,
      },
      201,
      requestId
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
