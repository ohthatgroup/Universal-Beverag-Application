import { productsWithMissingInfoPrompt } from '../prompts/catalog/products-with-missing-info'
import { newProductPrompt } from '../prompts/catalog/new-product'
import type { Moment } from '../types'
import type { DbFacade } from '@/lib/server/db'

/** Catalog page moments. v1 ships hygiene + evergreen; the
 *  opportunity (`hot-product-not-featured`) and urgent
 *  (`discontinued-in-active-deals`) prompts arrive in a follow-up
 *  push when their resolvers + drawers are ready. */
export async function getCatalogPageMoments(
  db: DbFacade,
): Promise<Moment[]> {
  const missingInfo = await productsWithMissingInfoPrompt(db)
  const flat: Moment[] = []
  if (missingInfo) flat.push(missingInfo)
  flat.push(newProductPrompt())
  return flat.sort((a, b) => b.weight - a.weight)
}
