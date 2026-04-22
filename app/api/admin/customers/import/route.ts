import { z } from 'zod'
import { getBulkField, readBulkColumn } from '@/lib/admin/bulk-transfer'
import { parseDelimitedData } from '@/lib/delimited'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { provisionCustomerProfile } from '@/lib/server/customer-provisioning'

const importSchema = z.object({
  raw: z.string().trim().min(1).max(2_000_000),
})

const MAX_IMPORT_ROWS = 500
const MAX_RETURNED_ERRORS = 25

function toNullable(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseOptionalBooleanFlag(value: string, fieldKey: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  throw new Error(`${fieldKey} must be one of: true, false, yes, no, 1, 0`)
}

function parseOptionalDefaultGroup(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'brand' || normalized === 'size') {
    return normalized
  }
  throw new Error('default_group must be one of: brand, size')
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
        `Limit imports to ${MAX_IMPORT_ROWS} customer rows at a time.`
      )
    }

    const db = await getRequestDb()
    let createdCount = 0
    let failedCount = 0
    const errors: Array<{ lineNumber: number; message: string }> = []

    for (const record of parsed.records) {
      try {
        const businessName = readBulkColumn(record.values, getBulkField('customers', 'business_name'))
        const email = readBulkColumn(record.values, getBulkField('customers', 'email'))
        const contactName = toNullable(
          readBulkColumn(record.values, getBulkField('customers', 'contact_name'))
        )
        const phone = toNullable(readBulkColumn(record.values, getBulkField('customers', 'phone')))
        const address = toNullable(readBulkColumn(record.values, getBulkField('customers', 'address')))
        const city = toNullable(readBulkColumn(record.values, getBulkField('customers', 'city')))
        const state = toNullable(readBulkColumn(record.values, getBulkField('customers', 'state')))
        const zip = toNullable(readBulkColumn(record.values, getBulkField('customers', 'zip')))
        const showPrices = parseOptionalBooleanFlag(
          readBulkColumn(record.values, getBulkField('customers', 'show_prices')),
          'show_prices'
        )
        const customPricing = parseOptionalBooleanFlag(
          readBulkColumn(record.values, getBulkField('customers', 'custom_pricing')),
          'custom_pricing'
        )
        const defaultGroup = parseOptionalDefaultGroup(
          readBulkColumn(record.values, getBulkField('customers', 'default_group'))
        )

        const created = await provisionCustomerProfile({
          businessName,
          email,
        })

        if (
          contactName ||
          phone ||
          address ||
          city ||
          state ||
          zip ||
          showPrices !== null ||
          customPricing !== null ||
          defaultGroup !== null
        ) {
          await db.query(
            `update profiles
             set contact_name = $2,
                 phone = $3,
                 address = $4,
                 city = $5,
                 state = $6,
                 zip = $7,
                 show_prices = coalesce($8, show_prices),
                 custom_pricing = coalesce($9, custom_pricing),
                 default_group = coalesce($10, default_group),
                 updated_at = now()
             where id = $1`,
            [
              created.id,
              contactName,
              phone,
              address,
              city,
              state,
              zip,
              showPrices,
              customPricing,
              defaultGroup,
            ]
          )
        }

        createdCount += 1
      } catch (error) {
        failedCount += 1
        if (errors.length < MAX_RETURNED_ERRORS) {
          errors.push({
            lineNumber: record.lineNumber,
            message: error instanceof Error ? error.message : 'Failed to import customer',
          })
        }
      }
    }

    return apiOk(
      {
        createdCount,
        failedCount,
        errors,
      },
      200,
      requestId
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
