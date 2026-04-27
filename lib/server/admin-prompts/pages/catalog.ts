import { productsWithMissingInfoPrompt } from '../prompts/catalog/products-with-missing-info'
import { newProductPrompt } from '../prompts/catalog/new-product'
import { sortByCategoryOrder } from '../fold'
import type { Prompt } from '../types'
import type { DbFacade } from '@/lib/server/db'

/** Catalog page prompts. v1 ships hygiene + evergreen; the
 *  opportunity (`hot-product-not-featured`) and urgent
 *  (`discontinued-in-active-deals`) prompts arrive in a follow-up
 *  push when their resolvers + drawers are ready. */
export async function getCatalogPagePrompts(
  db: DbFacade,
): Promise<Prompt[]> {
  const [missingInfo] = await Promise.all([
    productsWithMissingInfoPrompt(db),
  ])
  const flat: Prompt[] = []
  if (missingInfo) flat.push(missingInfo)
  flat.push(newProductPrompt())
  return sortByCategoryOrder(flat)
}
