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

    const definition = getBulkDefinition('products')
    const mode = resolveMode(request)

    if (mode === 'template') {
      const { headers, rows } = buildBulkTemplateRows('products')
      return createCsvDownloadResponse(definition.templateFilename, headers, rows)
    }

    const db = await getRequestDb()
    const { rows } = await db.query<{
      brand_name: string | null
      title: string
      pack_details: string | null
      pack_count: number | null
      size_value: number | null
      size_uom: string | null
      price: number
      image_url: string | null
      tags: string[] | null
      is_new: boolean | null
      is_discontinued: boolean | null
    }>(
      `select b.name as brand_name,
              p.title,
              p.pack_details,
              p.pack_count,
              p.size_value,
              p.size_uom,
              p.price,
              p.image_url,
              p.tags,
              p.is_new,
              p.is_discontinued
       from products p
       left join brands b on b.id = p.brand_id
       where p.customer_id is null
       order by p.sort_order asc, p.title asc`
    )

    return createCsvDownloadResponse(
      `${definition.exportFilenamePrefix}-${todayISODate()}.csv`,
      getBulkHeaders('products'),
      rows.map((row) => ({
        brand_name: row.brand_name ?? '',
        title: row.title,
        pack_details: row.pack_details ?? '',
        pack_count: row.pack_count ?? '',
        size_value: row.size_value ?? '',
        size_uom: row.size_uom ?? '',
        price: Number(row.price ?? 0),
        image_url: row.image_url ?? '',
        tags: (row.tags ?? []).join(', '),
        is_new: row.is_new ?? false,
        is_discontinued: row.is_discontinued ?? false,
      }))
    )
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
