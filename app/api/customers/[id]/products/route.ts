import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
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
  const db = await getRequestDb()
  const { rows } = await db.query<{ id: string }>(
    `select id from profiles where id = $1 and role = 'customer' limit 1`,
    [customerId]
  )

  if (!rows[0]) {
    throw new RouteError(404, 'customer_not_found', 'Customer not found')
  }

  return context
}

async function assertProductsVisibleToCustomer(customerId: string, productIds: string[]) {
  const db = await getRequestDb()
  const uniqueIds = Array.from(new Set(productIds))
  if (uniqueIds.length === 0) return

  const { rows } = await db.query<{ id: string }>(
    `select id
     from products
     where id = any($1::uuid[]) and (customer_id is null or customer_id = $2)`,
    [uniqueIds, customerId]
  )

  const visibleIds = new Set(rows.map((product) => product.id))
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
    const db = await getRequestDb()
    await assertProductsVisibleToCustomer(id, [payload.productId])

    const hidden = payload.hidden ?? false
    const customPrice = payload.customPrice ?? null

    if (!hidden && customPrice === null) {
      await db.query(
        `delete from customer_products where customer_id = $1 and product_id = $2`,
        [id, payload.productId]
      )
      return apiOk({ deleted: true }, 200, requestId)
    }

    await db.query(
      `insert into customer_products (customer_id, product_id, excluded, custom_price)
       values ($1, $2, $3, $4)
       on conflict (customer_id, product_id)
       do update set excluded = EXCLUDED.excluded, custom_price = EXCLUDED.custom_price`,
      [id, payload.productId, hidden, customPrice]
    )

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
    const db = await getRequestDb()

    const updatesByProductId = new Map<string, { productId: string; customPrice: number | null }>()
    for (const update of payload.updates) {
      updatesByProductId.set(update.productId, update)
    }

    const updates = Array.from(updatesByProductId.values())
    const productIds = updates.map((update) => update.productId)

    await assertProductsVisibleToCustomer(id, productIds)

    const { rows: existingRows } = await db.query<{
      product_id: string
      excluded: boolean | null
      custom_price: number | null
    }>(
      `select product_id, excluded, custom_price
       from customer_products
       where customer_id = $1 and product_id = any($2::uuid[])`,
      [id, productIds]
    )

    const existingByProductId = new Map(
      existingRows.map((row) => [
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
      await db.query(
        `delete from customer_products
         where customer_id = $1 and product_id = any($2::uuid[])`,
        [id, toDelete]
      )
    }

    if (toUpsert.length > 0) {
      for (const row of toUpsert) {
        await db.query(
          `insert into customer_products (customer_id, product_id, excluded, custom_price)
           values ($1, $2, $3, $4)
           on conflict (customer_id, product_id)
           do update set excluded = EXCLUDED.excluded, custom_price = EXCLUDED.custom_price`,
          [row.customer_id, row.product_id, row.excluded, row.custom_price]
        )
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
    const db = await getRequestDb()

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

    const { rows } = await db.query<{
      id: string
      title: string
      brand_id: string | null
      pack_details: string | null
      pack_count: number | null
      size_value: number | null
      size_uom: string | null
      price: number
      customer_id: string | null
    }>(
      `insert into products (
        brand_id, customer_id, title, pack_details, pack_count, size_value, size_uom, price, image_url, is_new, is_discontinued, sort_order
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, coalesce((select min(sort_order) from products where customer_id is null or customer_id = $2), 0) - 1
      )
      returning id, title, brand_id, pack_details, pack_count, size_value, size_uom, price, customer_id`,
      [
        payload.brandId ?? null,
        id,
        payload.title,
        packDetails,
        packCount,
        sizeValue,
        sizeUom,
        Number(payload.price),
        payload.imageUrl || null,
      ]
    )
    const created = rows[0]
    if (!created) throw new Error('Failed to create product')

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
