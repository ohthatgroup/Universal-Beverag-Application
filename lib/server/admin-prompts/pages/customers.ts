import { defaultGroupBucketPrompt } from '../prompts/customers/default-group-bucket'
import { customersWithMissingInfoPrompt } from '../prompts/customers/customers-with-missing-info'
import { newCustomerPrompt } from '../prompts/customers/new-customer'
import { sortByCategoryOrder } from '../fold'
import type { Prompt } from '../types'
import type { DbFacade } from '@/lib/server/db'

/**
 * Customers page prompts — identity / segmentation only.
 *
 * Stale customers + first-order welcome + customer anniversary now
 * live on the Orders page (they're "trigger an order" prompts, not
 * relationship prompts). See `docs/admin-prompts-decisions.md`.
 */
export async function getCustomersPagePrompts(
  db: DbFacade,
): Promise<Prompt[]> {
  const [defaultGroup, missingInfo] = await Promise.all([
    defaultGroupBucketPrompt(db),
    customersWithMissingInfoPrompt(db),
  ])
  const flat: Prompt[] = []
  if (defaultGroup) flat.push(defaultGroup)
  if (missingInfo) flat.push(missingInfo)
  flat.push(newCustomerPrompt())
  return sortByCategoryOrder(flat)
}
