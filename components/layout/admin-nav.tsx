'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ShoppingBag, BarChart3, ArrowLeft, Package, Tag, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const mainLinks = [
  { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/staff', label: 'Staff', icon: ShieldCheck },
  { href: '/admin/catalog', label: 'Catalog', icon: ShoppingBag },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

const catalogSubLinks = [
  { href: '/admin/catalog', label: 'Products', icon: Package, exact: true },
  { href: '/admin/brands', label: 'Brands', icon: Tag },
  { href: '/admin/catalog/pallets', label: 'Pallets', icon: ShoppingBag },
]

function isCatalogRoute(pathname: string) {
  return (
    pathname === '/admin/catalog' ||
    pathname.startsWith('/admin/catalog/') ||
    pathname === '/admin/brands' ||
    pathname.startsWith('/admin/brands/')
  )
}

export function AdminNav() {
  const pathname = usePathname()
  const showCatalogSub = isCatalogRoute(pathname)

  if (showCatalogSub) {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid h-16 w-full grid-cols-4 gap-1 px-2">
          <Link
            href="/admin/dashboard"
            className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
          {catalogSubLinks.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors',
                  isActive && 'text-foreground'
                )}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto grid h-16 w-full grid-cols-5 gap-1 px-2">
        {mainLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors',
                isActive && 'text-foreground'
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
