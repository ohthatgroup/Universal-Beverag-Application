import { staleCustomersPrompt } from '../prompts/customers/stale-customers'
import { staleDraftsPrompt } from '../prompts/orders/stale-drafts'
import { newOrderPrompt } from '../prompts/orders/new-order'
import type { Moment } from '../types'
import type { DbFacade } from '@/lib/server/db'

/**
 * Orders page moments — anything driving an order. Includes outreach
 * prompts whose intent is "trigger an order" (stale customers, first
 * order welcome, anniversary), per the ordering-surface-not-CRM cut.
 */
export async function getOrdersPageMoments(
  db: DbFacade,
): Promise<Moment[]> {
  const [stale, staleCust] = await Promise.all([
    staleDraftsPrompt(db),
    staleCustomersPrompt(db),
  ])
  const flat: Moment[] = []
  if (staleCust) flat.push(staleCust)
  if (stale) flat.push(stale)
  flat.push(newOrderPrompt())
  return flat.sort((a, b) => b.weight - a.weight)
}
