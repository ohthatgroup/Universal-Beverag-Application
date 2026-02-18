'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Home' },
  { href: '/orders', label: 'Orders' },
]

export function CustomerNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-14 w-full max-w-mobile grid-cols-2 px-4">
        {links.map((link) => {
          const isActive =
            pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center justify-center text-sm font-medium text-muted-foreground transition-colors',
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
