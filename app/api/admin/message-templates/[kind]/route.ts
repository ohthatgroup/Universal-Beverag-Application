import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { isTemplateKind } from '@/lib/server/message-templates'

const schema = z.object({ body: z.string().min(1).max(4000) })

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const requestId = getRequestId(request)
  try {
    const ctx = await requireAuthContext(['salesman'])
    const { kind } = await params
    if (!isTemplateKind(kind)) {
      throw new RouteError(
        404,
        'unknown_template_kind',
        `Template kind "${kind}" is not recognized`,
      )
    }
    const payload = await parseBody(request, schema)
    const db = await getRequestDb()

    await db.query(
      `insert into message_templates (kind, body, updated_by, updated_at)
        values ($1, $2, $3, now())
        on conflict (kind)
        do update set body = excluded.body,
                      updated_by = excluded.updated_by,
                      updated_at = excluded.updated_at`,
      [kind, payload.body, ctx.profile.id],
    )
    return apiOk({ kind, body: payload.body }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
