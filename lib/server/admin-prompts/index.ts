// Public API of the admin prompts module.
//
// New code should consume the `*PageMoments` family — these return
// `Moment[]`, the data the fade-down renderer expects.
//
// The legacy `*PagePrompts` family is preserved for tests and any
// internal consumer that hasn't migrated; it returns the older
// `Prompt[]` shape and is internally lifted through
// `legacyPromptToMoment()`.

import { getCustomersPagePrompts } from './pages/customers'
import { getOrdersPagePrompts } from './pages/orders'
import { getCatalogPagePrompts } from './pages/catalog'
import { getAnnouncementsPagePrompts } from './pages/announcements'
import { getDashboardPagePrompts } from './pages/dashboard'
import { legacyPromptToMoment } from './to-moment'
import type { DbFacade } from '@/lib/server/db'
import type { Moment } from './types'

// ---- Type re-exports ------------------------------------------------

export type {
  Moment,
  MomentCategory,
  Doorway,
  DoorwayAction,
  Subject,
  Prompt,
  PromptCategory,
  PromptSeverity,
  PromptAction,
  PromptTitleComposer,
} from './types'

// ---- Legacy helpers (still used by tests / fold logic) --------------

export { CATEGORY_ORDER, foldPrompts, sortByCategoryOrder } from './fold'
export { legacyPromptToMoment } from './to-moment'

// ---- Legacy Prompt-shaped page resolvers (kept for back-compat) -----

export {
  getCustomersPagePrompts,
  getOrdersPagePrompts,
  getCatalogPagePrompts,
  getAnnouncementsPagePrompts,
  getDashboardPagePrompts,
}

/** @deprecated Use `getCustomersPageMoments`. */
export const getCustomersPrompts = getCustomersPagePrompts
/** @deprecated Use `getOrdersPageMoments`. */
export const getOrdersPrompts = getOrdersPagePrompts
/** @deprecated Use `getAnnouncementsPageMoments`. */
export const getDealsPrompts = getAnnouncementsPagePrompts

// ---- Moment-shaped page resolvers — the new entry points ------------

export async function getCustomersPageMoments(db: DbFacade): Promise<Moment[]> {
  const prompts = await getCustomersPagePrompts(db)
  return prompts.map(legacyPromptToMoment)
}

export async function getOrdersPageMoments(db: DbFacade): Promise<Moment[]> {
  const prompts = await getOrdersPagePrompts(db)
  return prompts.map(legacyPromptToMoment)
}

export async function getCatalogPageMoments(db: DbFacade): Promise<Moment[]> {
  const prompts = await getCatalogPagePrompts(db)
  return prompts.map(legacyPromptToMoment)
}

export async function getAnnouncementsPageMoments(
  db: DbFacade,
): Promise<Moment[]> {
  const prompts = await getAnnouncementsPagePrompts(db)
  return prompts.map(legacyPromptToMoment)
}

export async function getDashboardPageMoments(db: DbFacade): Promise<Moment[]> {
  const prompts = await getDashboardPagePrompts(db)
  return prompts.map(legacyPromptToMoment)
}
