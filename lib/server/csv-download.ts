import type { CsvRow } from '@/lib/utils'
import { buildCsv } from '@/lib/utils'

export function createCsvDownloadResponse(
  filename: string,
  headers: string[],
  rows: CsvRow[]
) {
  const csv = `\uFEFF${buildCsv(rows, headers)}`

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}
