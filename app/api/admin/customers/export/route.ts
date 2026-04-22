import { buildBulkTemplateRows, getBulkDefinition, getBulkHeaders } from '@/lib/admin/bulk-transfer'
import { getRequestId, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { createCsvDownloadResponse } from '@/lib/server/csv-download'
import { getRequestDb } from '@/lib/server/db'
import { todayISODate } from '@/lib/utils'

function resolveMode(request: Request) {
  const url = new URL(request.url)
  return url.searchParams.get('mode') === 'template' ? 'template' : 'data'
}

export async function GET(request: Request) {
  const requestId = getRequestId(request)

  try {
    await requireAuthContext(['salesman'])

    const definition = getBulkDefinition('customers')
    const mode = resolveMode(request)

    if (mode === 'template') {
      const { headers, rows } = buildBulkTemplateRows('customers')
      return createCsvDownloadResponse(definition.templateFilename, headers, rows)
    }

    const db = await getRequestDb()
    const { rows } = await db.query<{
      business_name: string | null
      contact_name: string | null
      email: string | null
      phone: string | null
      address: string | null
      city: string | null
      state: string | null
      zip: string | null
      show_prices: boolean | null
      custom_pricing: boolean | null
      default_group: 'brand' | 'size' | null
    }>(
      `select business_name, contact_name, email, phone, address, city, state, zip,
              show_prices, custom_pricing, default_group
       from profiles
       where role = 'customer'
       order by business_name asc nulls last, contact_name asc nulls last, id asc`
    )

    return createCsvDownloadResponse(
      `${definition.exportFilenamePrefix}-${todayISODate()}.csv`,
      getBulkHeaders('customers'),
      rows.map((row) => ({
        business_name: row.business_name ?? '',
        contact_name: row.contact_name ?? '',
        email: row.email ?? '',
        phone: row.phone ?? '',
        address: row.address ?? '',
        city: row.city ?? '',
        state: row.state ?? '',
        zip: row.zip ?? '',
        show_prices: row.show_prices ?? true,
        custom_pricing: row.custom_pricing ?? false,
        default_group: row.default_group ?? 'brand',
      }))
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
