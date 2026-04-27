import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { announcementCreateSchema } from '@/lib/server/schemas'
import {
  fetchAllAnnouncements,
  rowToAnnouncement,
} from '@/lib/server/announcements'

/** GET /api/admin/announcements — list every announcement, ordered by sort_order. */
export async function GET(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const db = await getRequestDb()
    const announcements = await fetchAllAnnouncements(db)
    return apiOk({ announcements }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

interface InsertedRow {
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
  target_group_ids: string[] | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  sort_order: number
  created_at: string | Date
  updated_at: string | Date
}

/** POST /api/admin/announcements — create an announcement. */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, announcementCreateSchema)
    const db = await getRequestDb()

    const { rows } = await db.query<InsertedRow>(
      `insert into announcements (
         kind,
         content_type,
         title,
         body,
         image_url,
         cta_label,
         cta_target_kind,
         cta_target_url,
         cta_target_product_id,
         cta_target_product_ids,
         product_id,
         product_ids,
         badge_overrides,
         product_quantities,
         audience_tags,
         target_group_ids,
         starts_at,
         ends_at,
         is_active,
         sort_order
       ) values (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10::uuid[],
         $11, $12::uuid[], $13::jsonb, $14::jsonb, $15::text[], $16::uuid[],
         $17::date, $18::date, $19,
         coalesce($20, (select coalesce(max(sort_order), -1) + 1 from announcements))
       )
       returning
         id,
         kind,
         content_type,
         title,
         body,
         image_url,
         cta_label,
         cta_target_kind,
         cta_target_url,
         cta_target_product_id,
         cta_target_product_ids,
         product_id,
         product_ids,
         badge_overrides,
         product_quantities,
         audience_tags,
         target_group_ids,
         starts_at::text as starts_at,
         ends_at::text as ends_at,
         is_active,
         sort_order,
         created_at,
         updated_at`,
      [
        payload.kind ?? 'announcement',
        payload.content_type ?? 'text',
        payload.title ?? null,
        payload.body ?? null,
        payload.image_url ?? null,
        payload.cta_label ?? null,
        payload.cta_target_kind ?? null,
        payload.cta_target_url ?? null,
        payload.cta_target_product_id ?? null,
        payload.cta_target_product_ids ?? [],
        payload.product_id ?? null,
        payload.product_ids ?? [],
        JSON.stringify(payload.badge_overrides ?? {}),
        JSON.stringify(payload.product_quantities ?? {}),
        payload.audience_tags ?? [],
        payload.target_group_ids ?? [],
        payload.starts_at ?? null,
        payload.ends_at ?? null,
        payload.is_active ?? true,
        payload.sort_order ?? null,
      ],
    )

    const created = rows[0]
    if (!created) {
      throw new Error('Failed to create announcement')
    }

    return apiOk({ announcement: rowToAnnouncement(created) }, 201, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
