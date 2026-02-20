import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { formatStructuredPack, normalizePackUom } from '@/lib/utils'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const updateCustomerProductSchema = z.object({
  productId: z.string().uuid(),
  hidden: z.boolean().optional(),
  customPrice: z.number().min(0).nullable().optional(),
})

const bulkPriceUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        productId: z.string().uuid(),
        customPrice: z.number().min(0).nullable(),
      })
    )
    .min(1),
})

const createCustomerProductSchema = z.object({
  brandId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1),
  packDetails: z.string().trim().optional().nullable(),
  packCount: z.coerce.number().int().positive().optional().nullable(),
  sizeValue: z.coerce.number().positive().optional().nullable(),
  sizeUom: z.string().trim().optional().nullable(),
  price: z.coerce.number().positive(),
  imageUrl: z.string().trim().optional().nullable(),
})

async function assertCustomerExists(customerId: string) {
  const context = await requireAuthContext(['salesman'])
  const { data: customer, error } = await context.supabase
    .from('profiles')
    .select('id')
    .eq('id', customerId)
    .eq('role', 'customer')
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!customer) {
    throw new RouteError(404, 'customer_not_found', 'Customer not found')
  }

  return context
}

async function assertProductsVisibleToCustomer(
  customerId: string,
  productIds: string[],
  requestContext: Awaited<ReturnType<typeof requireAuthContext>>
) {
  const uniqueIds = Array.from(new Set(productIds))
  if (uniqueIds.length === 0) return

  const { data: products, error } = await requestContext.supabase
    .from('products')
    .select('id')
    .in('id', uniqueIds)
    .or(`customer_id.is.null,customer_id.eq.${customerId}`)

  if (error) {
    throw error
  }

  const visibleIds = new Set((products ?? []).map((product) => product.id))
  if (uniqueIds.some((productId) => !visibleIds.has(productId))) {
    throw new RouteError(
      400,
      'validation_error',
      'One or more products are not available for this customer'
    )
  }
}

export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, updateCustomerProductSchema)
    const context = await assertCustomerExists(id)
    await assertProductsVisibleToCustomer(id, [payload.productId], context)

    const hidden = payload.hidden ?? false
    const customPrice = payload.customPrice ?? null

    if (!hidden && customPrice === null) {
      const { error } = await context.supabase
        .from('customer_products')
        .delete()
        .eq('customer_id', id)
        .eq('product_id', payload.productId)

      if (error) {
        throw error
      }

      return apiOk({ deleted: true }, 200, requestId)
    }

    const { error } = await context.supabase
      .from('customer_products')
      .upsert(
        {
          customer_id: id,
          product_id: payload.productId,
          excluded: hidden,
          custom_price: customPrice,
        },
        { onConflict: 'customer_id,product_id' }
      )

    if (error) {
      throw error
    }

    logApiEvent(requestId, 'customer_product_updated', {
      customerId: id,
      productId: payload.productId,
      hidden,
      userId: context.userId,
    })

    return apiOk({ saved: true }, 200, requestId)
  } catch (error) {
    if (error instanceof RouteError) {
      logApiEvent(requestId, 'customer_product_update_failed', {
        code: error.code,
        error: error.message,
      })
    } else {
      logApiEvent(requestId, 'customer_product_update_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      })
    }
    return toErrorResponse(error, requestId)
  }
}

export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, bulkPriceUpdateSchema)
    const context = await assertCustomerExists(id)

    const updatesByProductId = new Map<string, { productId: string; customPrice: number | null }>()
    for (const update of payload.updates) {
      updatesByProductId.set(update.productId, update)
    }

    const updates = Array.from(updatesByProductId.values())
    const productIds = updates.map((update) => update.productId)

    await assertProductsVisibleToCustomer(id, productIds, context)

    const { data: existingRows, error: existingError } = await context.supabase
      .from('customer_products')
      .select('product_id,excluded,custom_price')
      .eq('customer_id', id)
      .in('product_id', productIds)

    if (existingError) {
      throw existingError
    }

    const existingByProductId = new Map(
      (existingRows ?? []).map((row) => [
        row.product_id,
        { excluded: Boolean(row.excluded), customPrice: row.custom_price },
      ])
    )

    const toDelete: string[] = []
    const toUpsert: Array<{
      customer_id: string
      product_id: string
      excluded: boolean
      custom_price: number | null
    }> = []

    for (const update of updates) {
      const existing = existingByProductId.get(update.productId)
      const excluded = existing?.excluded ?? false

      if (!excluded && update.customPrice === null) {
        toDelete.push(update.productId)
      } else {
        toUpsert.push({
          customer_id: id,
          product_id: update.productId,
          excluded,
          custom_price: update.customPrice,
        })
      }
    }

    if (toDelete.length > 0) {
      const { error: deleteError } = await context.supabase
        .from('customer_products')
        .delete()
        .eq('customer_id', id)
        .in('product_id', toDelete)

      if (deleteError) {
        throw deleteError
      }
    }

    if (toUpsert.length > 0) {
      const { error: upsertError } = await context.supabase.from('customer_products').upsert(toUpsert, {
        onConflict: 'customer_id,product_id',
      })

      if (upsertError) {
        throw upsertError
      }
    }

    logApiEvent(requestId, 'customer_product_prices_updated', {
      customerId: id,
      count: updates.length,
      userId: context.userId,
    })

    return apiOk({ saved: true, count: updates.length }, 200, requestId)
  } catch (error) {
    if (error instanceof RouteError) {
      logApiEvent(requestId, 'customer_product_prices_update_failed', {
        code: error.code,
        error: error.message,
      })
    } else {
      logApiEvent(requestId, 'customer_product_prices_update_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      })
    }
    return toErrorResponse(error, requestId)
  }
}

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, createCustomerProductSchema)
    const context = await assertCustomerExists(id)

    const packCount = payload.packCount ?? null
    const sizeValue = payload.sizeValue ?? null
    const sizeUomRaw = payload.sizeUom ? normalizePackUom(payload.sizeUom) : null
    const sizeUom = sizeUomRaw && sizeUomRaw.length > 0 ? sizeUomRaw : null

    const hasStructuredInput = packCount !== null || sizeValue !== null || sizeUom !== null
    if (hasStructuredInput && (packCount === null || sizeValue === null || sizeUom === null)) {
      throw new RouteError(
        400,
        'validation_error',
        'Pack count, size value, and unit must all be set together'
      )
    }

    const inferredPackDetails =
      packCount !== null && sizeValue !== null && sizeUom
        ? formatStructuredPack(packCount, sizeValue, sizeUom)
        : null
    const packDetails = payload.packDetails?.trim() || inferredPackDetails || null

    const { data: firstBySort, error: sortFetchError } = await context.supabase
      .from('products')
      .select('sort_order')
      .or(`customer_id.is.null,customer_id.eq.${id}`)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (sortFetchError) {
      throw sortFetchError
    }

    const nextSortOrder = (firstBySort?.sort_order ?? 0) - 1

    const { data: created, error: createError } = await context.supabase
      .from('products')
      .insert({
        brand_id: payload.brandId ?? null,
        customer_id: id,
        title: payload.title,
        pack_details: packDetails,
        pack_count: packCount,
        size_value: sizeValue,
        size_uom: sizeUom,
        price: Number(payload.price),
        image_url: payload.imageUrl || null,
        is_new: true,
        is_discontinued: false,
        sort_order: nextSortOrder,
      })
      .select('id,title,brand_id,pack_details,pack_count,size_value,size_uom,price,customer_id')
      .single()

    if (createError) {
      throw createError
    }

    logApiEvent(requestId, 'customer_scoped_product_created', {
      customerId: id,
      productId: created.id,
      userId: context.userId,
    })

    return apiOk({ product: created }, 201, requestId)
  } catch (error) {
    if (error instanceof RouteError) {
      logApiEvent(requestId, 'customer_scoped_product_create_failed', {
        code: error.code,
        error: error.message,
      })
    } else {
      logApiEvent(requestId, 'customer_scoped_product_create_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      })
    }
    return toErrorResponse(error, requestId)
  }
}
