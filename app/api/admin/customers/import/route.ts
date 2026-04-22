import { z } from 'zod'
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

function normalizeColumnKey(value: string) {
  return value.replace(/[\s_-]+/g, '').toLowerCase()
}

function readColumn(
  row: Record<string, string>,
  aliases: string[]
) {
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
      const businessName = readColumn(record.values, [
        'businessName',
        'business_name',
        'business',
        'company',
        'name',
      ])
      const email = readColumn(record.values, ['email', 'email_address', 'emailAddress'])
      const contactName = toNullable(
        readColumn(record.values, ['contactName', 'contact_name', 'contact', 'owner'])
      )
      const phone = toNullable(readColumn(record.values, ['phone', 'phone_number', 'phoneNumber']))
      const address = toNullable(readColumn(record.values, ['address', 'street', 'street_address']))
      const city = toNullable(readColumn(record.values, ['city']))
      const state = toNullable(readColumn(record.values, ['state', 'province']))
      const zip = toNullable(readColumn(record.values, ['zip', 'zipcode', 'postal', 'postalcode']))

      try {
        const created = await provisionCustomerProfile({
          businessName,
          email,
        })

        if (contactName || phone || address || city || state || zip) {
          await db.query(
            `update profiles
             set contact_name = $2,
                 phone = $3,
                 address = $4,
                 city = $5,
                 state = $6,
                 zip = $7,
                 updated_at = now()
             where id = $1`,
            [created.id, contactName, phone, address, city, state, zip]
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
