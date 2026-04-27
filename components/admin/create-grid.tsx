'use client'

import {
  ClipboardList,
  Megaphone,
  PackageOpen,
  Settings,
  UserPlus,
} from 'lucide-react'
import { CreateCard } from '@/components/admin/create-card'
import type { CreateCounts } from '@/lib/server/admin-create-counts'

/**
 * Five-card grid that lives at the bottom of `/admin`. Teaches Dave
 * what's in the system (counts) and lets him create new entries
 * (drawers) — plus a destination card for Settings, which intentionally
 * omits its count to signal "this is not a creatable inventory."
 *
 * Layout: 1 col on `<sm`, 2 cols at `sm`, 3 cols at `lg+`.
 * A 5-card grid lays out as 3+2 at lg.
 */
export function CreateGrid({ counts }: { counts: CreateCounts }) {
  return (
    <section
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Create"
    >
      <CreateCard
        kind="drawer"
        drawerKind="new-customer"
        icon={UserPlus}
        count={counts.customers}
        countLabel="customers"
        headline="Add a customer"
        description="Create a profile and provision their portal link."
      />
      <CreateCard
        kind="drawer"
        drawerKind="pick-customer-and-open-draft"
        icon={ClipboardList}
        count={counts.orders}
        countLabel="orders"
        headline="Open a draft"
        description="Pick a customer and a delivery date — opens the draft builder."
      />
      <CreateCard
        kind="drawer"
        drawerKind="new-product"
        icon={PackageOpen}
        count={counts.products}
        countLabel="products"
        headline="Add a product"
        description="Add a SKU to the catalog."
      />
      <CreateCard
        kind="drawer"
        drawerKind="new-announcement"
        icon={Megaphone}
        count={counts.deals}
        countLabel="active deals"
        headline="Pin a deal"
        description="Pin a deal or announcement to the customer homepage."
      />
      <CreateCard
        kind="link"
        href="/admin/settings"
        icon={Settings}
        headline="Open Settings"
        description="Manage staff, brands, presets, and message templates."
      />
    </section>
  )
}
