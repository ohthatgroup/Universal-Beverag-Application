import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { formatStructuredPack, normalizePackUom } from '@/lib/utils'

const createProductSchema = z.object({
  brandId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1),
  packDetails: z.string().trim().optional().nullable(),
  packCount: z.coerce.number().int().positive().optional().nullable(),
  sizeValue: z.coerce.number().positive().optional().nullable(),
  sizeUom: z.string().trim().optional().nullable(),
  price: z.coerce.number().positive(),
  imageUrl: z.string().trim().optional().nullable(),
  isNew: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, createProductSchema)
    const db = await getRequestDb()

    const packCount = payload.packCount ?? null
    const sizeValue = payload.sizeValue ?? null
    const sizeUomRaw = payload.sizeUom ? normalizePackUom(payload.sizeUom) : null
    const sizeUom = sizeUomRaw && sizeUomRaw.length > 0 ? sizeUomRaw : null

    const hasStructuredInput = packCount !== null || sizeValue !== null || sizeUom !== null
    if (hasStructuredInput && (packCount === null || sizeValue === null || sizeUom === null)) {
      throw new RouteError(400, 'validation_error', 'Pack count, size value, and unit must all be set together')
    }

    const inferredPackDetails =
      packCount !== null && sizeValue !== null && sizeUom
        ? formatStructuredPack(packCount, sizeValue, sizeUom)
        : null
    const packDetails = payload.packDetails?.trim() || inferredPackDetails || null

    const { rows } = await db.query<{ id: string }>(
      `insert into products (
        brand_id, customer_id, title, pack_details, pack_count, size_value, size_uom, price, image_url, is_new, is_discontinued, sort_order
      ) values (
        $1, null, $2, $3, $4, $5, $6, $7, $8, $9, false, coalesce((select min(sort_order) from products where customer_id is null), 0) - 1
      ) returning id`,
      [
        payload.brandId ?? null,
        payload.title,
        packDetails,
        packCount,
        sizeValue,
        sizeUom,
        Number(payload.price),
        payload.imageUrl || null,
        payload.isNew ?? false,
      ]
    )
    const data = rows[0]
    if (!data) throw new Error('Failed to create product')

    return apiOk({ productId: data.id }, 201, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
