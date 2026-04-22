import { z } from 'zod'
import { getBulkField, readBulkColumn, normalizeBulkColumnKey } from '@/lib/admin/bulk-transfer'
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

function parseOptionalPositiveInteger(value: string, fieldName: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parsePositiveNumber(trimmed, fieldName)
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be a whole number`)
  }
  return parsed
}

function parseBooleanFlag(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return false
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  throw new Error('isNew must be one of: true, false, yes, no, 1, 0')
}

function parseBooleanFlagForField(value: string, fieldKey: string) {
  try {
    return parseBooleanFlag(value)
  } catch {
    throw new Error(`${fieldKey} must be one of: true, false, yes, no, 1, 0`)
  }
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
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
      brandRows.map((brand) => [normalizeBulkColumnKey(brand.name), brand.id])
    )
    let nextSortOrder = Number(sortRows[0]?.next_sort_order ?? 0)
    let createdCount = 0
    let failedCount = 0
    let createdBrandCount = 0
    const errors: Array<{ lineNumber: number; message: string }> = []

    for (const record of parsed.records) {
      try {
        const title = readBulkColumn(record.values, getBulkField('products', 'title'))
        if (!title) {
          throw new Error('title is required')
        }

        const price = parsePositiveNumber(
          readBulkColumn(record.values, getBulkField('products', 'price')),
          'price'
        )
        const brandName = toNullable(readBulkColumn(record.values, getBulkField('products', 'brand_name')))
        const packDetails = toNullable(
          readBulkColumn(record.values, getBulkField('products', 'pack_details'))
        )
        const packCount = parseOptionalPositiveInteger(
          readBulkColumn(record.values, getBulkField('products', 'pack_count')),
          'packCount'
        )
        const sizeValue = parseOptionalPositiveNumber(
          readBulkColumn(record.values, getBulkField('products', 'size_value')),
          'sizeValue'
        )
        const sizeUomRaw = toNullable(readBulkColumn(record.values, getBulkField('products', 'size_uom')))
        const imageUrl = toNullable(readBulkColumn(record.values, getBulkField('products', 'image_url')))
        const tags = parseTags(readBulkColumn(record.values, getBulkField('products', 'tags')))
        const isNew = parseBooleanFlagForField(
          readBulkColumn(record.values, getBulkField('products', 'is_new')),
          'is_new'
        )
        const isDiscontinued = parseBooleanFlagForField(
          readBulkColumn(record.values, getBulkField('products', 'is_discontinued')),
          'is_discontinued'
        )

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
          const normalizedBrandName = normalizeBulkColumnKey(brandName)
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
             brand_id, customer_id, title, pack_details, pack_count, size_value, size_uom, price, image_url, tags, is_new, is_discontinued, sort_order
           ) values (
             $1, null, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
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
            tags.length > 0 ? tags : null,
            isNew,
            isDiscontinued,
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
