// Dashboard aggregator — runs every per-page resolver in parallel,
// returns the flattened list sorted by descending weight.
//
// `any-time` (create) moments are filtered OUT here because the
// dashboard renders them as a dedicated Create grid (`<CreateGrid>`)
// below the moment stream. Per-domain pages still surface their own
// any-time moments inside their moment streams.

import { getCustomersPageMoments } from './customers'
import { getOrdersPageMoments } from './orders'
import { getCatalogPageMoments } from './catalog'
import { getAnnouncementsPageMoments } from './announcements'
import type { Moment } from '../types'
import type { DbFacade } from '@/lib/server/db'

export async function getDashboardPageMoments(
  db: DbFacade,
): Promise<Moment[]> {
  const [customers, orders, catalog, announcements] = await Promise.all([
    getCustomersPageMoments(db),
    getOrdersPageMoments(db),
    getCatalogPageMoments(db),
    getAnnouncementsPageMoments(db),
  ])

  return [...customers, ...orders, ...catalog, ...announcements]
    .filter((m) => m.category !== 'any-time')
    .sort((a, b) => b.weight - a.weight)
}
