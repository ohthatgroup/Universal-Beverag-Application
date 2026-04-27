'use client'

import { BulkAssignGroupDrawer } from './bulk-assign-group-drawer'
import { BulkExtendDealsDrawer } from './bulk-extend-deals-drawer'
import { CustomersMissingInfoDrawer } from './customers-missing-info-drawer'
import { OutreachDrawer } from './outreach-drawer'
import { PinDealForGroupsDrawer } from './pin-deal-for-groups-drawer'
import { ProductsMissingInfoDrawer } from './products-missing-info-drawer'
import { StubDrawer } from './stub-drawer'
export { StubDrawer }
import type { MomentDrawerComponent } from './registry'

/**
 * The drawer registry. Maps a prompt's `action.drawerKind` to the
 * component that opens. `StubDrawer` is the unmapped fallback the
 * provider uses when a kind isn't found here — that lets new prompts
 * ship safely with a placeholder until their real drawer lands.
 *
 * Only kinds with an emitter in `lib/server/admin-prompts/` are
 * registered. Adding a new kind = (1) emit it from a resolver,
 * (2) build the component, (3) register it here.
 */
export const promptDrawerRegistry: Record<string, MomentDrawerComponent> = {
  // Customers
  'bulk-assign-group': BulkAssignGroupDrawer,
  'customers-missing-info': CustomersMissingInfoDrawer,
  'new-customer': StubDrawer,

  // Orders
  outreach: OutreachDrawer,
  'stale-drafts': StubDrawer,
  'pick-customer-and-open-draft': StubDrawer,

  // Catalog
  'products-missing-info': ProductsMissingInfoDrawer,
  'new-product': StubDrawer,

  // Announcements
  'bulk-extend-deals': BulkExtendDealsDrawer,
  'pin-deal-for-groups': PinDealForGroupsDrawer,
  'new-announcement': StubDrawer,
}
