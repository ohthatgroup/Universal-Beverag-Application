'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { signOutAction } from '@/app/(admin)/admin/actions'

type NavLink = {
  href: string
  label: string
  match: (p: string) => boolean
}

interface AdminHamburgerProps {
  primaryLinks: NavLink[]
  adminLinks: NavLink[]
}

export function AdminHamburger({ primaryLinks, adminLinks }: AdminHamburgerProps) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  const homeActive =
    pathname === '/admin/dashboard' || pathname.startsWith('/admin/dashboard')

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 bg-background/80 backdrop-blur"
      >
        <SheetHeader>
          <SheetTitle className="font-mono">UB Admin</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/admin/dashboard"
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    homeActive
                      ? 'bg-muted text-foreground'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  Home
                </Link>
              </li>
              {primaryLinks.map((item) => {
                const active = item.match(pathname)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          <section>
            <h3 className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Admin
            </h3>
            <ul className="space-y-1">
              {adminLinks.map((item) => {
                const active = item.match(pathname)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'block rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="border-t pt-4">
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
