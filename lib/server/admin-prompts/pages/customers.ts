import { defaultGroupBucketPrompt } from '../prompts/customers/default-group-bucket'
import { customersWithMissingInfoPrompt } from '../prompts/customers/customers-with-missing-info'
import { newCustomerPrompt } from '../prompts/customers/new-customer'
import type { Moment } from '../types'
import type { DbFacade } from '@/lib/server/db'

/**
 * Customers page moments — identity / segmentation only.
 *
 * Stale customers + first-order welcome + customer anniversary now
 * live on the Orders page (they're "trigger an order" prompts, not
 * relationship prompts). See `docs/admin-prompts-decisions.md`.
 */
export async function getCustomersPageMoments(
  db: DbFacade,
): Promise<Moment[]> {
  const [defaultGroup, missingInfo] = await Promise.all([
    defaultGroupBucketPrompt(db),
    customersWithMissingInfoPrompt(db),
  ])
  const flat: Moment[] = []
  if (defaultGroup) flat.push(defaultGroup)
  if (missingInfo) flat.push(missingInfo)
  flat.push(newCustomerPrompt())
  return flat.sort((a, b) => b.weight - a.weight)
}
