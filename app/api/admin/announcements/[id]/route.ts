import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { announcementUpdateSchema } from '@/lib/server/schemas'
import { rowToAnnouncement } from '@/lib/server/announcements'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

interface UpdatedRow {
  id: string
  kind: string
  content_type: string
  title: string | null
  body: string | null
  image_url: string | null
  cta_label: string | null
  cta_target_kind: string | null
  cta_target_url: string | null
  cta_target_product_id: string | null
  cta_target_product_ids: string[] | null
  product_id: string | null
  product_ids: string[] | null
  badge_overrides: Record<string, string> | null
  product_quantities: Record<
    string,
    { default_qty?: number; locked?: boolean }
  > | null
  audience_tags: string[] | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  sort_order: number
  created_at: string | Date
  updated_at: string | Date
}

/** PATCH /api/admin/announcements/[id] — partial update. */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, announcementUpdateSchema)
    const db = await getRequestDb()

    // Build a column-by-column SET clause from only the fields the caller
    // actually sent. Skip nothing → 304-ish no-op (we still return the row).
    const sets: string[] = []
    const values: unknown[] = [id]
    let paramIndex = 2

    type FieldKey = keyof typeof payload

    const addSet = (column: string, value: unknown, cast?: string) => {
      const placeholder = `$${paramIndex}${cast ? `::${cast}` : ''}`
      sets.push(`${column} = ${placeholder}`)
      values.push(value)
      paramIndex += 1
    }

    const has = (key: FieldKey) =>
      Object.prototype.hasOwnProperty.call(payload, key)

    if (has('kind')) addSet('kind', payload.kind)
    if (has('content_type')) addSet('content_type', payload.content_type)
    if (has('title')) addSet('title', payload.title)
    if (has('body')) addSet('body', payload.body)
    if (has('image_url')) addSet('image_url', payload.image_url)
    if (has('cta_label')) addSet('cta_label', payload.cta_label)
    if (has('cta_target_kind')) addSet('cta_target_kind', payload.cta_target_kind)
    if (has('cta_target_url')) addSet('cta_target_url', payload.cta_target_url)
    if (has('cta_target_product_id'))
      addSet('cta_target_product_id', payload.cta_target_product_id)
    if (has('cta_target_product_ids'))
      addSet('cta_target_product_ids', payload.cta_target_product_ids ?? [], 'uuid[]')
    if (has('product_id')) addSet('product_id', payload.product_id)
    if (has('product_ids'))
      addSet('product_ids', payload.product_ids ?? [], 'uuid[]')
    if (has('badge_overrides'))
      addSet('badge_overrides', JSON.stringify(payload.badge_overrides ?? {}), 'jsonb')
    if (has('product_quantities'))
      addSet(
        'product_quantities',
        JSON.stringify(payload.product_quantities ?? {}),
        'jsonb',
      )
    if (has('audience_tags'))
      addSet('audience_tags', payload.audience_tags ?? [], 'text[]')
    if (has('starts_at')) addSet('starts_at', payload.starts_at, 'date')
    if (has('ends_at')) addSet('ends_at', payload.ends_at, 'date')
    if (has('is_active')) addSet('is_active', payload.is_active)
    if (has('sort_order')) addSet('sort_order', payload.sort_order)

    if (sets.length === 0) {
      // Nothing to update — return current row.
      const { rows } = await db.query<UpdatedRow>(
        `select
           id, kind, content_type, title, body, image_url, cta_label,
           cta_target_kind, cta_target_url, cta_target_product_id,
           cta_target_product_ids, product_id, product_ids,
           badge_overrides, product_quantities, audience_tags,
           starts_at::text as starts_at, ends_at::text as ends_at,
           is_active, sort_order, created_at, updated_at
         from announcements where id = $1 limit 1`,
        [id],
      )
      const row = rows[0]
      if (!row) {
        throw new RouteError(404, 'announcement_not_found', 'Announcement not found')
      }
      return apiOk({ announcement: rowToAnnouncement(row) }, 200, requestId)
    }

    const sql = `update announcements
                 set ${sets.join(', ')}
                 where id = $1
                 returning
                   id, kind, content_type, title, body, image_url, cta_label,
                   cta_target_kind, cta_target_url, cta_target_product_id,
                   cta_target_product_ids, product_id, product_ids,
                   badge_overrides, product_quantities, audience_tags,
                   starts_at::text as starts_at, ends_at::text as ends_at,
                   is_active, sort_order, created_at, updated_at`

    const { rows } = await db.query<UpdatedRow>(sql, values)
    const updated = rows[0]
    if (!updated) {
      throw new RouteError(404, 'announcement_not_found', 'Announcement not found')
    }

    return apiOk({ announcement: rowToAnnouncement(updated) }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

/** DELETE /api/admin/announcements/[id] — hard delete (per §5 D2). */
export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const db = await getRequestDb()

    const result = await db.query('delete from announcements where id = $1', [id])
    if (result.rowCount === 0) {
      throw new RouteError(404, 'announcement_not_found', 'Announcement not found')
    }

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
