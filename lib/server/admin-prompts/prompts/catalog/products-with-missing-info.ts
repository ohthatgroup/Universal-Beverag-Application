import type { Moment, Subject } from '../../types'
import type { DbFacade } from '@/lib/server/db'
import { foldedWeight } from '../../weight'

interface Row {
  id: string
  title: string
  has_image: boolean
  has_brand: boolean
  has_pack: boolean
}

/**
 * Combined hygiene audit for products. Fires when any non-discontinued
 * product is missing image, brand, or any pack details.
 */
export async function productsWithMissingInfoPrompt(
  db: DbFacade,
): Promise<Moment | null> {
  const { rows } = await db.query<Row>(
    `select id,
            title,
            image_url is not null and image_url <> '' as has_image,
            brand_id is not null as has_brand,
            (pack_details is not null and pack_details <> '')
              or (pack_count is not null and size_value is not null and size_uom is not null) as has_pack
       from products
      where is_discontinued = false
        and (
              image_url is null or image_url = ''
           or brand_id is null
           or (
                (pack_details is null or pack_details = '')
                and (pack_count is null or size_value is null or size_uom is null)
              )
        )
      order by lower(title) asc
      limit 50`,
  )
  if (rows.length === 0) return null

  const subjects: Subject[] = rows.map((row) => {
    const missing: string[] = []
    if (!row.has_image) missing.push('image')
    if (!row.has_brand) missing.push('brand')
    if (!row.has_pack) missing.push('pack')
    return {
      id: row.id,
      label: row.title,
      sublabel: `missing ${missing.join(', ')}`,
    }
  })

  const count = subjects.length
  const weight = foldedWeight(0.4, count)

  return {
    id: 'worth-a-look/products-with-missing-info',
    category: 'worth-a-look',
    kind: 'products-with-missing-info',
    narrative:
      count === 1
        ? "1 product is missing image, brand, or pack details."
        : `${count} products are missing image, brand, or pack details.`,
    when: 'catalog cleanup',
    subjects,
    primary: {
      label: 'Tidy up the catalog',
      action: { kind: 'drawer', drawerKind: 'products-missing-info' },
    },
    secondary: [],
    weight,
  }
}
