'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnnouncementDialog } from '@/components/admin/announcement-dialog'

interface CustomerHomepageManagerProps {
  customerId: string
  customerName: string
}

// TODO: replace with real data from per-customer queries (see docs/handoff/homepage-redesign.md)
const MOCK_GLOBAL_DEALS = [
  { id: 'deal-1', title: 'Spring beverage bundle', price: 89.99, savings: '$12' },
  { id: 'deal-2', title: 'Mixed energy 4-pack bundle', price: 124.5, savings: '$18' },
]

const MOCK_GLOBAL_ANNOUNCEMENTS = [
  { id: 'a-1', title: 'Summer Launch' },
  { id: 'a-2', title: 'May Promo' },
]

const MOCK_CUSTOM_ANNOUNCEMENTS = [
  { id: 'c-1', title: 'Acme exclusive promo' },
]

export function CustomerHomepageManager({
  customerId,
  customerName,
}: CustomerHomepageManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSave = () => {
    // TODO: wire up POST /api/admin/customers/[id]/announcements
    setDialogOpen(false)
  }

  return (
    <div className="space-y-8">
      {/* DEALS */}
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Deals
          </h2>
          <p className="text-sm text-muted-foreground">
            Active deals visible to all customers:
          </p>
        </header>

        <ul className="space-y-2">
          {MOCK_GLOBAL_DEALS.map((deal) => (
            <li
              key={deal.id}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{deal.title}</p>
                <p className="text-xs text-muted-foreground">
                  ${deal.price.toFixed(2)} · Save {deal.savings}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Hide for {customerName}
              </Button>
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Pinned deal for this customer only:
          </p>
          <Button variant="outline">
            <Plus className="h-4 w-4" />
            Pin a specific deal
          </Button>
        </div>
      </section>

      <hr className="border-foreground/10" />

      {/* ANNOUNCEMENTS */}
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Announcements
          </h2>
          <p className="text-sm text-muted-foreground">
            Showing to {customerName} (tag match or all):
          </p>
        </header>

        <ul className="space-y-2">
          {MOCK_GLOBAL_ANNOUNCEMENTS.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3"
            >
              <p className="text-sm font-medium">{a.title}</p>
              <span className="text-xs text-muted-foreground">read-only</span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 pt-2">
          <p className="text-sm text-muted-foreground">
            Created just for {customerName}:
          </p>
          <ul className="space-y-2">
            {MOCK_CUSTOM_ANNOUNCEMENTS.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
              >
                <p className="text-sm font-medium">{a.title}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add announcement for {customerName}
          </Button>
        </div>
      </section>

      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />

      {/* customerId is reserved for backend wiring */}
      <span className="hidden" data-customer-id={customerId} />
    </div>
  )
}
