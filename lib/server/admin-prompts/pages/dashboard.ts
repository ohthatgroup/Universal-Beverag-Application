// Dashboard aggregator — runs every per-page resolver in parallel,
// returns the flattened list sorted by canonical category order.
//
// Evergreen ("any-time" / create) prompts are filtered OUT here
// because the dashboard now renders them as a dedicated Create grid
// (`<CreateGrid>`) below the moment stream. Per-domain pages still
// surface their own evergreens inside their moment streams.

import { getCustomersPagePrompts } from './customers'
import { getOrdersPagePrompts } from './orders'
import { getCatalogPagePrompts } from './catalog'
import { getAnnouncementsPagePrompts } from './announcements'
import { sortByCategoryOrder } from '../fold'
import type { Prompt } from '../types'
import type { DbFacade } from '@/lib/server/db'

export async function getDashboardPagePrompts(
  db: DbFacade,
): Promise<Prompt[]> {
  const [customers, orders, catalog, announcements] = await Promise.all([
    getCustomersPagePrompts(db),
    getOrdersPagePrompts(db),
    getCatalogPagePrompts(db),
    getAnnouncementsPagePrompts(db),
  ])

  const flat: Prompt[] = []
  for (const prompt of [
    ...customers,
    ...orders,
    ...catalog,
    ...announcements,
  ]) {
    if (prompt.category === 'evergreen') continue
    flat.push(prompt)
  }
  return sortByCategoryOrder(flat)
}
