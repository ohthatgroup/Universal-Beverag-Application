// Public API of the admin prompts module.
//
// All resolvers emit `Moment[]` directly. The legacy `Prompt` shape
// and its adapter (`legacyPromptToMoment`) have been retired.

export type {
  Moment,
  MomentCategory,
  Doorway,
  DoorwayAction,
  Subject,
} from './types'

export { getCustomersPageMoments } from './pages/customers'
export { getOrdersPageMoments } from './pages/orders'
export { getCatalogPageMoments } from './pages/catalog'
export { getAnnouncementsPageMoments } from './pages/announcements'
export { getDashboardPageMoments } from './pages/dashboard'
