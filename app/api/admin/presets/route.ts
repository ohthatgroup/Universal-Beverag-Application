import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { createPresetSchema } from '@/lib/server/schemas'

export async function GET(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const db = await getRequestDb()

    const { rows } = await db.query<{
      id: string
      name: string
      description: string | null
      brand_count: number
      size_count: number
      product_count: number
    }>(
      `select
         p.id,
         p.name,
         p.description,
         coalesce(b.n, 0)::int as brand_count,
         coalesce(s.n, 0)::int as size_count,
         coalesce(pr.n, 0)::int as product_count
       from presets p
       left join (
         select preset_id, count(*) as n from preset_brand_rules
         where is_hidden or is_pinned
         group by preset_id
       ) b on b.preset_id = p.id
       left join (
         select preset_id, count(*) as n from preset_size_rules
         where is_hidden
         group by preset_id
       ) s on s.preset_id = p.id
       left join (
         select preset_id, count(*) as n from preset_product_rules
         group by preset_id
       ) pr on pr.preset_id = p.id
       order by p.name asc`
    )

    return apiOk(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        brandCount: row.brand_count,
        sizeCount: row.size_count,
        productCount: row.product_count,
      })),
      200,
      requestId
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, createPresetSchema)
    const db = await getRequestDb()

    const { rows } = await db.query<{
      id: string
      name: string
      description: string | null
    }>(
      `insert into presets (name, description)
       values ($1, $2)
       returning id, name, description`,
      [payload.name, payload.description ?? null]
    )
    const created = rows[0]
    if (!created) throw new Error('Failed to create preset')

    return apiOk(
      {
        id: created.id,
        name: created.name,
        description: created.description,
        brandCount: 0,
        sizeCount: 0,
        productCount: 0,
      },
      201,
      requestId
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
