'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/catalog', label: 'Catalog' },
  { href: '/admin/reports', label: 'Reports' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-16 w-full max-w-mobile grid-cols-5 gap-1 px-2">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center justify-center text-center text-xs font-medium text-muted-foreground transition-colors',
                isActive && 'text-foreground'
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
