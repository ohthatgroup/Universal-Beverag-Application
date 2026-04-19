'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const iconLinks = [
  {
    href: '/admin/customers',
    label: 'Customers',
    icon: Users,
    match: (p: string) => p === '/admin/customers' || p.startsWith('/admin/customers/'),
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: Settings,
    match: (p: string) =>
      p === '/admin' ||
      p.startsWith('/admin/catalog') ||
      p.startsWith('/admin/brands') ||
      p.startsWith('/admin/staff') ||
      p.startsWith('/admin/reports'),
  },
]

export function AdminTopBar() {
  const pathname = usePathname()
  const todayActive =
    pathname === '/admin/dashboard' ||
    pathname.startsWith('/admin/dashboard') ||
    pathname.startsWith('/admin/orders')

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link
          href="/admin/dashboard"
          aria-label="Today"
          className={cn(
            'rounded-md px-2 py-1 font-mono text-sm font-bold tracking-tight transition-colors',
            todayActive ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted'
          )}
        >
          UB
        </Link>
        <nav className="flex items-center gap-1">
          {iconLinks.map((item) => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  active && 'bg-muted text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
