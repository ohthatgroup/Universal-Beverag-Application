import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatStructuredPack, isSupportedPackUom, normalizePackUom } from '@/lib/utils'

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
    const admin = createAdminClient()

    const packCount = payload.packCount ?? null
    const sizeValue = payload.sizeValue ?? null
    const sizeUomRaw = payload.sizeUom ? normalizePackUom(payload.sizeUom) : null
    const sizeUom = sizeUomRaw && sizeUomRaw.length > 0 ? sizeUomRaw : null

    const hasStructuredInput = packCount !== null || sizeValue !== null || sizeUom !== null
    if (hasStructuredInput && (packCount === null || sizeValue === null || sizeUom === null)) {
      throw new RouteError(400, 'validation_error', 'Pack count, size value, and unit must all be set together')
    }
    if (sizeUom && !isSupportedPackUom(sizeUom)) {
      throw new RouteError(400, 'validation_error', 'Unsupported unit of measure')
    }

    const inferredPackDetails =
      packCount !== null && sizeValue !== null && sizeUom
        ? formatStructuredPack(packCount, sizeValue, sizeUom)
        : null
    const packDetails = payload.packDetails?.trim() || inferredPackDetails || null

    const { data: firstBySort, error: sortFetchError } = await admin
      .from('products')
      .select('sort_order')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (sortFetchError) {
      throw sortFetchError
    }

    const nextSortOrder = (firstBySort?.sort_order ?? 0) - 1

    const { data, error } = await admin
      .from('products')
      .insert({
        brand_id: payload.brandId ?? null,
        title: payload.title,
        pack_details: packDetails,
        pack_count: packCount,
        size_value: sizeValue,
        size_uom: sizeUom,
        price: Number(payload.price),
        image_url: payload.imageUrl || null,
        is_new: payload.isNew ?? false,
        is_discontinued: false,
        sort_order: nextSortOrder,
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    return apiOk({ productId: data.id }, 201, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}

