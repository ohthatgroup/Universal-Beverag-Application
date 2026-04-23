'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAction } from '@/app/(admin)/admin/actions'
import { AdminHamburger } from './admin-hamburger'

type NavLink = {
  href: string
  label: string
  match: (p: string) => boolean
}

const PRIMARY_LINKS: NavLink[] = [
  {
    href: '/admin/customers',
    label: 'Customers',
    match: (p) => p === '/admin/customers' || p.startsWith('/admin/customers/'),
  },
  {
    href: '/admin/orders',
    label: 'Orders',
    match: (p) => p === '/admin/orders' || p.startsWith('/admin/orders/'),
  },
  {
    href: '/admin/catalog',
    label: 'Products',
    match: (p) => p.startsWith('/admin/catalog'),
  },
]

const ADMIN_LINKS: NavLink[] = [
  {
    href: '/admin/brands',
    label: 'Brands',
    match: (p) => p.startsWith('/admin/brands'),
  },
  {
    href: '/admin/catalog/pallets',
    label: 'Pallets',
    match: (p) => p.startsWith('/admin/catalog/pallets'),
  },
  {
    href: '/admin/presets',
    label: 'Presets',
    match: (p) => p.startsWith('/admin/presets'),
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    match: (p) => p.startsWith('/admin/reports'),
  },
  {
    href: '/admin/staff',
    label: 'Staff',
    match: (p) => p.startsWith('/admin/staff'),
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    match: (p) => p.startsWith('/admin/settings'),
  },
]

const ADMIN_PATHS = new Set(ADMIN_LINKS.map((l) => l.href))

export function AdminNav() {
  const pathname = usePathname()
  const homeActive =
    pathname === '/admin/dashboard' || pathname.startsWith('/admin/dashboard')
  const adminGroupActive = ADMIN_LINKS.some((l) => l.match(pathname))

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-2 px-4 md:px-6">
        <div className="flex items-center md:hidden">
          <AdminHamburger
            primaryLinks={PRIMARY_LINKS}
            adminLinks={ADMIN_LINKS}
          />
        </div>

        <Link
          href="/admin/dashboard"
          aria-label="Home"
          className={cn(
            'rounded-md px-2 py-1 font-mono text-sm font-bold tracking-tight transition-colors',
            homeActive
              ? 'bg-foreground text-background'
              : 'text-foreground hover:bg-muted'
          )}
        >
          UB
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {PRIMARY_LINKS.map((item) => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                adminGroupActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Admin
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[10rem] bg-background/80 backdrop-blur"
            >
              {ADMIN_LINKS.map((item) => {
                const active = item.match(pathname)
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn(active && 'bg-muted text-foreground')}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action={signOutAction} className="w-full">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export { ADMIN_PATHS }
