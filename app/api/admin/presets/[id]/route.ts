import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { updatePresetSchema } from '@/lib/server/schemas'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const db = await getRequestDb()

    const [{ rows: presets }, { rows: brandRules }, { rows: sizeRules }, { rows: productRules }] =
      await Promise.all([
        db.query<{ id: string; name: string; description: string | null }>(
          'select id, name, description from presets where id = $1 limit 1',
          [id]
        ),
        db.query<{ brand_id: string; is_hidden: boolean; is_pinned: boolean }>(
          'select brand_id, is_hidden, is_pinned from preset_brand_rules where preset_id = $1',
          [id]
        ),
        db.query<{ size_key: string; is_hidden: boolean }>(
          'select size_key, is_hidden from preset_size_rules where preset_id = $1',
          [id]
        ),
        db.query<{ product_id: string; is_hidden: boolean; is_pinned: boolean }>(
          'select product_id, is_hidden, is_pinned from preset_product_rules where preset_id = $1',
          [id]
        ),
      ])

    const preset = presets[0]
    if (!preset) {
      throw new RouteError(404, 'preset_not_found', 'Preset not found')
    }

    return apiOk(
      {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        brandRules: brandRules.map((row) => ({
          brandId: row.brand_id,
          isHidden: row.is_hidden,
          isPinned: row.is_pinned,
        })),
        sizeRules: sizeRules.map((row) => ({
          sizeKey: row.size_key,
          isHidden: row.is_hidden,
        })),
        productRules: productRules.map((row) => ({
          productId: row.product_id,
          isHidden: row.is_hidden,
          isPinned: row.is_pinned,
        })),
      },
      200,
      requestId
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, updatePresetSchema)
    const db = await getRequestDb()

    await db.transaction(async (client) => {
      const existing = await client.query<{ id: string }>(
        'select id from presets where id = $1 limit 1',
        [id]
      )
      if (!existing.rows[0]) {
        throw new RouteError(404, 'preset_not_found', 'Preset not found')
      }

      if (payload.name !== undefined || payload.description !== undefined) {
        await client.query(
          `update presets
           set name = coalesce($2, name),
               description = case when $3::boolean then $4 else description end
           where id = $1`,
          [
            id,
            payload.name ?? null,
            payload.description !== undefined,
            payload.description ?? null,
          ]
        )
      }

      if (payload.brandRules) {
        await client.query('delete from preset_brand_rules where preset_id = $1', [id])
        for (const rule of payload.brandRules) {
          if (!rule.isHidden && !rule.isPinned) continue
          await client.query(
            `insert into preset_brand_rules (preset_id, brand_id, is_hidden, is_pinned)
             values ($1, $2, $3, $4)`,
            [id, rule.brandId, rule.isHidden, rule.isPinned]
          )
        }
      }

      if (payload.sizeRules) {
        await client.query('delete from preset_size_rules where preset_id = $1', [id])
        for (const rule of payload.sizeRules) {
          if (!rule.isHidden) continue
          await client.query(
            `insert into preset_size_rules (preset_id, size_key, is_hidden)
             values ($1, $2, $3)`,
            [id, rule.sizeKey, rule.isHidden]
          )
        }
      }

      if (payload.productRules) {
        await client.query('delete from preset_product_rules where preset_id = $1', [id])
        for (const rule of payload.productRules) {
          await client.query(
            `insert into preset_product_rules (preset_id, product_id, is_hidden, is_pinned)
             values ($1, $2, $3, $4)`,
            [id, rule.productId, rule.isHidden, rule.isPinned]
          )
        }
      }
    })

    return apiOk({ id }, 200, requestId)
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

    await db.query('delete from presets where id = $1', [id])

    return apiOk({ deleted: true }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
