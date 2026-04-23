import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PresetEditor, type PresetEditorData } from '@/components/admin/preset-editor'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function PresetEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePageAuth(['salesman'])

  const db = await getRequestDb()

  const [
    { rows: presetRows },
    { rows: brandRows },
    { rows: sizeRows },
    { rows: productRows },
  ] = await Promise.all([
    db.query<{ id: string; name: string; description: string | null }>(
      'select id, name, description from presets where id = $1 limit 1',
      [id]
    ),
    db.query<{
      id: string
      name: string
      logo_url: string | null
      is_hidden: boolean | null
      is_pinned: boolean | null
    }>(
      `select b.id, b.name, b.logo_url,
              r.is_hidden, r.is_pinned
       from brands b
       left join preset_brand_rules r
         on r.brand_id = b.id and r.preset_id = $1
       order by b.sort_order, b.name`,
      [id]
    ),
    db.query<{
      size_key: string
      size_value: string | number | null
      size_uom: string | null
      is_hidden: boolean | null
    }>(
      `with distinct_sizes as (
         select distinct
           size_value::text || '_' || size_uom as size_key,
           size_value, size_uom
         from products
         where size_value is not null and size_uom is not null
       )
       select d.size_key, d.size_value::text as size_value, d.size_uom, r.is_hidden
       from distinct_sizes d
       left join preset_size_rules r
         on r.size_key = d.size_key and r.preset_id = $1
       order by d.size_uom, d.size_value`,
      [id]
    ),
    db.query<{
      id: string
      title: string
      brand_name: string | null
      size_value: string | number | null
      size_uom: string | null
      is_hidden: boolean
      is_pinned: boolean
    }>(
      `select p.id, p.title,
              b.name as brand_name,
              p.size_value::text as size_value, p.size_uom,
              r.is_hidden, r.is_pinned
       from preset_product_rules r
       join products p on p.id = r.product_id
       left join brands b on b.id = p.brand_id
       where r.preset_id = $1
       order by b.name nulls last, p.title`,
      [id]
    ),
  ])

  const preset = presetRows[0]
  if (!preset) notFound()

  const editorData: PresetEditorData = {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    brands: brandRows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
      hidden: row.is_hidden ?? false,
      pinned: row.is_pinned ?? false,
    })),
    sizes: sizeRows.map((row) => ({
      key: row.size_key,
      label: formatSizeLabel(row.size_value, row.size_uom),
      hidden: row.is_hidden ?? false,
    })),
    productOverrides: productRows.map((row) => ({
      id: row.id,
      title: row.title,
      brandName: row.brand_name ?? '—',
      sizeLabel: formatSizeLabel(row.size_value, row.size_uom),
      hidden: row.is_hidden,
      pinned: row.is_pinned,
    })),
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <PageHeader
        title={preset.name}
        breadcrumb={
          <Link
            href="/admin/presets"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Presets
          </Link>
        }
      />
      <PresetEditor preset={editorData} />
    </div>
  )
}

function formatSizeLabel(value: string | number | null, uom: string | null): string {
  if (value === null || uom === null) return '—'
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value
  const display = Number.isFinite(numeric) ? String(numeric).replace(/\.0+$/, '') : String(value)
  const uomLower = uom.toLowerCase()
  const uomLabel =
    uomLower === 'ml' || uomLower === 'oz' || uomLower === 'ct'
      ? uomLower
      : uomLower === 'liter' || uomLower === 'liters'
      ? 'L'
      : uomLower === 'gallon' || uomLower === 'gallons'
      ? 'gal'
      : uomLower
  return `${display} ${uomLabel}`
}
