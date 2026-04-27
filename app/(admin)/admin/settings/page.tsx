import { LogOut } from 'lucide-react'
import { AccountSettingsForm } from '@/components/admin/account-settings-form'
import { BulkUploadPanel } from '@/components/admin/bulk-upload-panel'
import { SettingsDrawerLauncher } from '@/components/admin/settings-drawer-launcher'
import {
  SettingsDrawerComingSoon,
  SettingsDrawerShell,
} from '@/components/admin/settings-drawers'
import { SettingsMessageTemplates } from '@/components/admin/settings-message-templates'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { signOutAction } from '../actions'

/**
 * `/admin/settings` — the hub for everything that doesn't need its
 * own top-level page in v1. Brands, Staff, Presets are surfaced here
 * as drawers (slice 5b populates the drawer bodies). Reports is
 * deferred entirely — placeholder row.
 *
 * The `?drawer=<kind>` query param drives drawer state; clicking a
 * launcher pushes the param, and direct nav to `/admin/<route>`
 * (configured in 5b) redirects here with the matching `drawer` set.
 */
export default async function SettingsPage() {
  const context = await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const [brands, staff, presets, customerGroups, salesmanRow] =
    await Promise.all([
      db.query<{ count: string }>(`select count(*)::text as count from brands`),
      db.query<{ count: string }>(
        `select count(*)::text as count from profiles where role = 'salesman'`,
      ),
      db.query<{ count: string }>(
        `select count(*)::text as count from presets`,
      ),
      db.query<{ count: string }>(
        `select count(*)::text as count from customer_groups`,
      ),
      db.query<{ office_email: string | null }>(
        `select office_email from profiles where id = $1 limit 1`,
        [context.userId],
      ),
    ])

  const initialOfficeEmail = salesmanRow.rows[0]?.office_email ?? null
  const accountLabel =
    context.profile.email ?? context.profile.contact_name ?? 'Signed in'

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10 pt-2">
      <PageHeader
        title="Settings"
        description="Manage Brands, Staff, Presets, message templates, and your account."
      />

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Manage
        </h2>
        <ul className="divide-y rounded-xl border bg-card">
          <li>
            <SettingsDrawerLauncher
              drawerKey="brands"
              label="Brands"
              description="Catalog brand list and merging."
              count={brands.rows[0]?.count}
            />
          </li>
          <li>
            <SettingsDrawerLauncher
              drawerKey="staff"
              label="Staff"
              description="Salesman accounts and invites."
              count={staff.rows[0]?.count}
            />
          </li>
          <li>
            <SettingsDrawerLauncher
              drawerKey="presets"
              label="Presets"
              description="Catalog visibility rule sets."
              count={presets.rows[0]?.count}
            />
          </li>
          <li>
            <SettingsDrawerLauncher
              drawerKey="groups"
              label="Customer groups"
              description="Audience segments for targeting."
              count={customerGroups.rows[0]?.count}
            />
          </li>
          <li>
            <SettingsDrawerLauncher
              drawerKey="reports"
              label="Reports"
              description="Revenue and order trends."
              comingSoon
            />
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Message templates
        </h2>
        <SettingsMessageTemplates />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Bulk data
        </h2>
        <BulkUploadPanel />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Account preferences
        </h2>
        <AccountSettingsForm initialOfficeEmail={initialOfficeEmail} />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Account
        </h2>
        <div className="rounded-xl border bg-card">
          <div className="px-4 py-3">
            <div className="text-xs text-muted-foreground">Signed in as</div>
            <div className="text-sm font-medium">{accountLabel}</div>
          </div>
          <div className="flex justify-end border-t px-4 py-3">
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-destructive"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Drawer dispatchers — read `?drawer=<key>` and render. Slice 5b
          replaces the placeholder bodies with real management surfaces. */}
      <SettingsDrawerShell
        drawerKey="brands"
        title="Brands"
        description="Browse and edit catalog brands."
      >
        <SettingsDrawerComingSoon href="/admin/brands" />
      </SettingsDrawerShell>
      <SettingsDrawerShell
        drawerKey="staff"
        title="Staff"
        description="Salesman accounts and invites."
      >
        <SettingsDrawerComingSoon href="/admin/staff" />
      </SettingsDrawerShell>
      <SettingsDrawerShell
        drawerKey="presets"
        title="Presets"
        description="Catalog visibility rule sets."
      >
        <SettingsDrawerComingSoon href="/admin/presets" />
      </SettingsDrawerShell>
      <SettingsDrawerShell
        drawerKey="groups"
        title="Customer groups"
        description="Manage audience segments."
      >
        <SettingsDrawerComingSoon href="/admin/customers/groups" />
      </SettingsDrawerShell>
    </div>
  )
}
