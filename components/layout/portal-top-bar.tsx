'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { History, ListChecks, Menu, Phone, UserCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { buildCustomerPortalBasePath } from '@/lib/portal-links'
import { cn } from '@/lib/utils'

interface PortalTopBarProps {
  token: string
  /**
   * The salesman who created this customer's account. Phone is the
   * tel:-formatted number; name is the rep's display name.
   */
  salesman: {
    name: string
    phone: string
  }
}

function formatPhoneNumber(raw: string): string {
  // E.164 → "(555) 123-4567" for US-style display. Fall back to raw on
  // anything we don't recognize (international, malformed, etc.) so we
  // never silently drop digits.
  const digits = raw.replace(/[^\d]/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return raw
}

export function PortalTopBar({ token, salesman }: PortalTopBarProps) {
  const pathname = usePathname()
  const base = buildCustomerPortalBasePath(token) ?? '/portal'
  const [menuOpen, setMenuOpen] = useState(false)

  const callHref = `tel:${salesman.phone.replace(/[^\d+]/g, '')}`
  const callLabel = `Call ${salesman.name.split(' ')[0]}`
  const callTitle = `Call ${salesman.name} · ${formatPhoneNumber(salesman.phone)}`

  const links = [
    {
      href: `${base}/orders`,
      label: 'Order history',
      icon: <History className="h-4 w-4" />,
      active: pathname === `${base}/orders` || pathname.startsWith(`${base}/orders/`),
    },
    {
      href: `${base}/catalog`,
      label: 'Catalog',
      icon: <ListChecks className="h-4 w-4" />,
      active: pathname === `${base}/catalog` || pathname.startsWith(`${base}/catalog/`),
    },
  ]

  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-2 px-4 md:px-6">
          {/* Mobile: hamburger menu */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            href={base}
            aria-label="Universal Beverages — home"
            className="inline-flex shrink-0 items-baseline text-base font-semibold tracking-tight transition-opacity hover:opacity-80"
          >
            <span className="text-foreground/80">Universal</span>
            <span className="text-accent">Beverages</span>
          </Link>

          {/* Desktop: inline links */}
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  link.active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Call salesman — primary affordance, since the rep
                relationship IS the product in wholesale. tel: link
                triggers the device's dialer. */}
            <Button asChild variant="accent" size="sm" className="h-8">
              <a href={callHref} title={callTitle}>
                <Phone className="h-4 w-4" />
                {callLabel}
              </a>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Account"
              className="h-8 w-8"
            >
              <Link href={`${base}/account`}>
                <UserCircle className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile menu side-sheet */}
      <Panel
        open={menuOpen}
        onOpenChange={setMenuOpen}
        variant="side-sheet"
        srTitle="Portal menu"
      >
        <Panel.Header>
          <h2 className="flex-1 text-base font-semibold">Menu</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Panel.Header>
        <Panel.Body className="space-y-1 px-3 py-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                link.active
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          <Link
            href={`${base}/account`}
            onClick={() => setMenuOpen(false)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
              pathname.startsWith(`${base}/account`)
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <UserCircle className="h-4 w-4" />
            Account
          </Link>
        </Panel.Body>
      </Panel>
    </>
  )
}
