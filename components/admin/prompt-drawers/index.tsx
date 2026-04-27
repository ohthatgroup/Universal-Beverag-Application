'use client'

import { BulkAssignGroupDrawer } from './bulk-assign-group-drawer'
import { BulkExtendDealsDrawer } from './bulk-extend-deals-drawer'
import { CustomersMissingInfoDrawer } from './customers-missing-info-drawer'
import { OutreachDrawer } from './outreach-drawer'
import { PinDealForGroupsDrawer } from './pin-deal-for-groups-drawer'
import { ProductsMissingInfoDrawer } from './products-missing-info-drawer'
import { QuickCreateDrawer } from './quick-create-drawer'
import { StubDrawer } from './stub-drawer'
import type { PromptDrawerComponent } from './registry'

/**
 * The drawer registry. Real drawers land progressively across slice 4;
 * everything else falls back to `StubDrawer`. Keep this in sync with
 * `docs/admin-prompts-decisions.md` — every prompt's
 * `action.drawerKind` must resolve here.
 */
export const promptDrawerRegistry: Record<string, PromptDrawerComponent> = {
  // Customers
  'bulk-assign-group': BulkAssignGroupDrawer,
  'customers-missing-info': CustomersMissingInfoDrawer,
  'new-customer': StubDrawer,

  // Orders (outreach + drafts + evergreen)
  outreach: OutreachDrawer,
  'stale-drafts': StubDrawer,
  'drafts-near-delivery': StubDrawer,
  'drafts-past-delivery': StubDrawer,
  'bulk-apply-usuals': StubDrawer,
  'bulk-close-empties': StubDrawer,
  'pick-customer-and-open-draft': StubDrawer,

  // Catalog
  'bulk-remove-from-deals': StubDrawer,
  'pin-as-deal': StubDrawer,
  'products-missing-info': ProductsMissingInfoDrawer,
  'new-product': StubDrawer,

  // Announcements
  'bulk-extend-deals': BulkExtendDealsDrawer,
  'pin-deal-for-groups': PinDealForGroupsDrawer,
  'new-deal-shortcut': StubDrawer,
  'new-announcement': StubDrawer,

  // Brands / Staff / Presets evergreens (slice 5b)
  'new-brand': StubDrawer,
  'new-staff-invite': StubDrawer,
  'new-preset': StubDrawer,

  // Dashboard
  'quick-create': QuickCreateDrawer,
}
