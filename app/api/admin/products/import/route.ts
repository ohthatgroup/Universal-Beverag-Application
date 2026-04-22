import { z } from 'zod'
import { parseDelimitedData } from '@/lib/delimited'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { formatStructuredPack, isSupportedPackUom, normalizePackUom } from '@/lib/utils'

const importSchema = z.object({
  raw: z.string().trim().min(1).max(2_000_000),
})

const MAX_IMPORT_ROWS = 500
const MAX_RETURNED_ERRORS = 25

function normalizeColumnKey(value: string) {
  return value.replace(/[\s_-]+/g, '').toLowerCase()
}

function readColumn(row: Record<string, string>, aliases: string[]) {
  const aliasSet = new Set(aliases.map(normalizeColumnKey))
  for (const [key, value] of Object.entries(row)) {
    if (aliasSet.has(normalizeColumnKey(key))) {
      return value.trim()
    }
  }
  return ''
}

function toNullable(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parsePositiveNumber(value: string, fieldName: string) {
  const normalized = value.replace(/[$,\s]/g, '')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive number`)
  }
  return parsed
}

function parseOptionalPositiveNumber(value: string, fieldName: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  return parsePositiveNumber(trimmed, fieldName)
}

function parseBooleanFlag(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return false
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  throw new Error('isNew must be one of: true, false, yes, no, 1, 0')
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, importSchema)
    const parsed = parseDelimitedData(payload.raw)

    if (parsed.records.length > MAX_IMPORT_ROWS) {
      throw new RouteError(
        400,
        'validation_error',
        `Limit imports to ${MAX_IMPORT_ROWS} product rows at a time.`
      )
    }

    const db = await getRequestDb()
    const { rows: brandRows } = await db.query<{ id: string; name: string }>(
      'select id, name from brands order by sort_order asc'
    )
    const { rows: sortRows } = await db.query<{ next_sort_order: number }>(
      `select coalesce(max(sort_order), -1) + 1 as next_sort_order
       from products
       where customer_id is null`
    )

    const brandIdByName = new Map(
      brandRows.map((brand) => [normalizeColumnKey(brand.name), brand.id])
    )
    let nextSortOrder = Number(sortRows[0]?.next_sort_order ?? 0)
    let createdCount = 0
    let failedCount = 0
    let createdBrandCount = 0
    const errors: Array<{ lineNumber: number; message: string }> = []

    for (const record of parsed.records) {
      try {
        const title = readColumn(record.values, ['title', 'product', 'productName', 'name'])
        if (!title) {
          throw new Error('title is required')
        }

        const price = parsePositiveNumber(
          readColumn(record.values, ['price', 'unitPrice', 'unit_price']),
          'price'
        )
        const brandName = toNullable(readColumn(record.values, ['brand', 'brandName', 'brand_name']))
        const packDetails = toNullable(
          readColumn(record.values, ['packDetails', 'pack_details', 'pack', 'packLabel'])
        )
        const packCount = parseOptionalPositiveNumber(
          readColumn(record.values, ['packCount', 'pack_count', 'caseCount']),
          'packCount'
        )
        const sizeValue = parseOptionalPositiveNumber(
          readColumn(record.values, ['sizeValue', 'size_value', 'size']),
          'sizeValue'
        )
        const sizeUomRaw = toNullable(readColumn(record.values, ['sizeUom', 'size_uom', 'uom', 'unit']))
        const imageUrl = toNullable(readColumn(record.values, ['imageUrl', 'image_url', 'image']))
        const isNew = parseBooleanFlag(readColumn(record.values, ['isNew', 'is_new', 'new']))

        const hasStructuredInput = packCount !== null || sizeValue !== null || sizeUomRaw !== null
        if (hasStructuredInput && (packCount === null || sizeValue === null || sizeUomRaw === null)) {
          throw new Error('packCount, sizeValue, and sizeUom must all be set together')
        }

        const sizeUom = sizeUomRaw ? normalizePackUom(sizeUomRaw) : null
        if (sizeUom && !isSupportedPackUom(sizeUom)) {
          throw new Error(`Unsupported sizeUom "${sizeUomRaw}"`)
        }

        let brandId: string | null = null
        if (brandName) {
          const normalizedBrandName = normalizeColumnKey(brandName)
          brandId = brandIdByName.get(normalizedBrandName) ?? null

          if (!brandId) {
            const { rows } = await db.query<{ id: string }>(
              `insert into brands (name, logo_url, sort_order)
               values ($1, null, coalesce((select max(sort_order) from brands), -1) + 1)
               returning id`,
              [brandName]
            )
            brandId = rows[0]?.id ?? null
            if (!brandId) {
              throw new Error(`Failed to create brand "${brandName}"`)
            }
            brandIdByName.set(normalizedBrandName, brandId)
            createdBrandCount += 1
          }
        }

        const structuredPack =
          packCount !== null && sizeValue !== null && sizeUom
            ? formatStructuredPack(packCount, sizeValue, sizeUom)
            : null

        await db.query(
          `insert into products (
             brand_id, customer_id, title, pack_details, pack_count, size_value, size_uom, price, image_url, is_new, is_discontinued, sort_order
           ) values (
             $1, null, $2, $3, $4, $5, $6, $7, $8, $9, false, $10
           )`,
          [
            brandId,
            title,
            packDetails ?? structuredPack,
            packCount,
            sizeValue,
            sizeUom,
            price,
            imageUrl,
            isNew,
            nextSortOrder,
          ]
        )

        nextSortOrder += 1
        createdCount += 1
      } catch (error) {
        failedCount += 1
        if (errors.length < MAX_RETURNED_ERRORS) {
          errors.push({
            lineNumber: record.lineNumber,
            message: error instanceof Error ? error.message : 'Failed to import product',
          })
        }
      }
    }

    return apiOk(
      {
        createdCount,
        failedCount,
        createdBrandCount,
        errors,
      },
      200,
      requestId
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
