import Link from 'next/link'
import { ChevronRight, LogOut } from 'lucide-react'
import { BulkUploadPanel } from '@/components/admin/bulk-upload-panel'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { signOutAction } from './actions'

export default async function AdminDrawerPage() {
  const context = await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const [customers, products, brands, announcements, customerGroups, staff] =
    await Promise.all([
      db.query<{ count: string }>(
        `select count(*)::text as count from profiles where role = 'customer'`,
      ),
      db.query<{ count: string }>(
        `select count(*)::text as count from products where customer_id is null and is_discontinued = false`,
      ),
      db.query<{ count: string }>(`select count(*)::text as count from brands`),
      db.query<{ count: string }>(
        `select count(*)::text as count from announcements where is_active = true`,
      ),
      db.query<{ count: string }>(
        `select count(*)::text as count from customer_groups`,
      ),
      db.query<{ count: string }>(
        `select count(*)::text as count from profiles where role = 'salesman'`,
      ),
    ])

  const items: Array<{ href: string; label: string; value?: string }> = [
    { href: '/admin/customers', label: 'Customers', value: customers.rows[0]?.count },
    {
      href: '/admin/customer-groups',
      label: 'Customer groups',
      value: customerGroups.rows[0]?.count,
    },
    { href: '/admin/catalog', label: 'Products', value: products.rows[0]?.count },
    { href: '/admin/brands', label: 'Brands', value: brands.rows[0]?.count },
    {
      href: '/admin/announcements',
      label: 'Deals & announcements',
      value: announcements.rows[0]?.count,
    },
    { href: '/admin/staff', label: 'Staff', value: staff.rows[0]?.count },
    { href: '/admin/reports', label: 'Reports' },
  ]

  const accountLabel =
    context.profile.email ?? context.profile.contact_name ?? 'Signed in'

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10 pt-2">
      <PageHeader
        title="Settings"
        description="Jump to a resource, move data in bulk, or manage your account."
      />

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Resources
        </h2>
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                  {item.value && <span className="tabular-nums">{item.value}</span>}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Bulk data
        </h2>
        <BulkUploadPanel />
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
              <Button type="submit" variant="outline" size="sm" className="text-destructive">
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
