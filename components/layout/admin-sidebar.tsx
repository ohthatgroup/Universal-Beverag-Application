'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ShoppingBag, BarChart3, ChevronDown, Tag, Package, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const topLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/staff', label: 'Staff', icon: ShieldCheck },
]

const catalogSubLinks = [
  { href: '/admin/catalog', label: 'Products', exact: true },
  { href: '/admin/brands', label: 'Brands' },
  { href: '/admin/catalog/pallets', label: 'Pallets' },
]

const bottomLinks = [
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

function isCatalogRoute(pathname: string) {
  return (
    pathname === '/admin/catalog' ||
    pathname.startsWith('/admin/catalog/') ||
    pathname === '/admin/brands' ||
    pathname.startsWith('/admin/brands/')
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const [catalogOpen, setCatalogOpen] = useState(isCatalogRoute(pathname))

  const linkClass = (href: string, exact?: boolean) => {
    const isActive = exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)
    return cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
      isActive && 'bg-accent text-foreground'
    )
  }

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r bg-background">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/admin/dashboard" className="text-lg font-semibold">
          Universal Beverages
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {topLinks.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass(link.href)}>
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}

        {/* Catalog with collapsible submenu */}
        <button
          type="button"
          onClick={() => setCatalogOpen(!catalogOpen)}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            isCatalogRoute(pathname) && 'text-foreground'
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          Catalog
          <ChevronDown
            className={cn(
              'ml-auto h-4 w-4 transition-transform',
              catalogOpen && 'rotate-180'
            )}
          />
        </button>

        {catalogOpen && (
          <div className="ml-4 space-y-1 border-l pl-3">
            {catalogSubLinks.map((sub) => {
              const icons: Record<string, typeof Tag> = {
                Products: Package,
                Brands: Tag,
                Pallets: ShoppingBag,
              }
              const SubIcon = icons[sub.label] ?? Package
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={linkClass(sub.href, sub.exact)}
                >
                  <SubIcon className="h-3.5 w-3.5" />
                  {sub.label}
                </Link>
              )
            })}
          </div>
        )}

        {bottomLinks.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass(link.href)}>
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
