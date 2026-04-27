import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { CreateGrid } from '@/components/admin/create-grid'
import { MomentStream } from '@/components/admin/moment-stream'
import {
  getCreateCounts,
} from '@/lib/server/admin-create-counts'
import { getDashboardPageMoments } from '@/lib/server/admin-prompts'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

/**
 * `/admin` — the morning page.
 *
 * Two stacked compositions:
 *
 *  1. **Moment Stream** — a centered, narrow column (max-w-2xl) of
 *     fading-down typographic moments. The page's center of mass.
 *  2. **Create Grid** — a wider 3-column grid (max-w-4xl) below the
 *     stream, surfacing 4 creatable surfaces + 1 destination card
 *     (Settings) so Dave learns what's in the system at a glance.
 *
 * The moments stay focused; the grid breathes. Both centered.
 */
export default async function AdminDashboardPage() {
  const ctx = await requirePageAuth(['salesman'])
  const db = await getRequestDb()
  const [moments, createCounts] = await Promise.all([
    getDashboardPageMoments(db),
    getCreateCounts(db),
  ])

  const name =
    firstName(ctx.profile.contact_name ?? ctx.profile.business_name) ??
    'Hello'

  return (
    <div className="mx-auto w-full max-w-4xl px-1 pb-16 pt-2">
      <header className="mx-auto max-w-2xl space-y-1 pb-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          {greeting()} · {today()}
        </p>
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.015em] text-foreground sm:text-[44px]">
          {name}
        </h1>
      </header>

      <div className="mx-auto max-w-2xl">
        <MomentStream
          moments={moments}
          emptyState={
            <p className="font-serif text-[28px] leading-[1.2] tracking-[-0.012em] text-foreground sm:text-[32px]">
              Quiet morning. Nothing on fire — open a draft, pin a deal, or
              add a customer when you&apos;re ready.
            </p>
          }
        />
      </div>

      <section className="mt-16 space-y-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
          Create
        </p>
        <CreateGrid counts={createCounts} />
      </section>

      <footer className="mt-16 flex items-baseline justify-end border-t border-foreground/10 pt-6">
        <Link
          href="/admin/settings"
          className="group inline-flex items-baseline gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Settings hub
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </div>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Late shift'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function today(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function firstName(full: string | null | undefined): string | null {
  if (!full) return null
  const trimmed = full.trim().split(/\s+/)[0]
  return trimmed && trimmed.length > 0 ? trimmed : null
}
