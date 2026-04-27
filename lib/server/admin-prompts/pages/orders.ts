import { staleCustomersPrompt } from '../prompts/customers/stale-customers'
import { staleDraftsPrompt } from '../prompts/orders/stale-drafts'
import { newOrderPrompt } from '../prompts/orders/new-order'
import { sortByCategoryOrder } from '../fold'
import type { Prompt } from '../types'
import type { DbFacade } from '@/lib/server/db'

/**
 * Orders page prompts — anything driving an order. Includes outreach
 * prompts whose intent is "trigger an order" (stale customers, first
 * order welcome, anniversary), per the ordering-surface-not-CRM cut.
 *
 * Slice 3 ports the existing `stale-drafts` and adds `stale-customers`
 * (currently still living in `prompts/customers/`); slice 4 fills in
 * the rest of the operational + outreach prompts.
 */
export async function getOrdersPagePrompts(
  db: DbFacade,
): Promise<Prompt[]> {
  const [stale, staleCust] = await Promise.all([
    staleDraftsPrompt(db),
    staleCustomersPrompt(db),
  ])
  const flat: Prompt[] = []
  if (staleCust) flat.push(staleCust)
  if (stale) flat.push(stale)
  flat.push(newOrderPrompt())
  return sortByCategoryOrder(flat)
}
