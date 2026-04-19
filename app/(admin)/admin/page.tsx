import Link from 'next/link'
import { ChevronRight, LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'
import { createClient } from '@/lib/supabase/server'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export default async function AdminDrawerPage() {
  const context = await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const [products, brands, pallets, staff] = await Promise.all([
    db.query<{ count: string }>(
      `select count(*)::text as count from products where customer_id is null and is_discontinued = false`
    ),
    db.query<{ count: string }>(`select count(*)::text as count from brands`),
    db.query<{ count: string }>(`select count(*)::text as count from pallet_deals where is_active = true`),
    db.query<{ count: string }>(`select count(*)::text as count from profiles where role = 'salesman'`),
  ])

  const items: Array<{ href: string; label: string; value?: string }> = [
    { href: '/admin/catalog', label: 'Products', value: products.rows[0]?.count },
    { href: '/admin/brands', label: 'Brands', value: brands.rows[0]?.count },
    { href: '/admin/catalog/pallets', label: 'Pallet deals', value: pallets.rows[0]?.count },
    { href: '/admin/staff', label: 'Staff', value: staff.rows[0]?.count },
    { href: '/admin/reports', label: 'Reports' },
  ]

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-2">
      <h1 className="text-2xl font-semibold">Admin</h1>

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

      <div className="divide-y rounded-xl border bg-card">
        <div className="px-4 py-3 text-sm text-muted-foreground">
          {context.profile.email ?? context.profile.contact_name ?? 'Signed in'}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-muted/40"
          >
            <span>Sign out</span>
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
