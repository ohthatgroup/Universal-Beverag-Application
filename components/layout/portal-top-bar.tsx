'use client'

import Link from 'next/link'
import { UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buildCustomerPortalBasePath } from '@/lib/portal-links'

interface PortalTopBarProps {
  token: string
  customerName: string
}

export function PortalTopBar({ token, customerName }: PortalTopBarProps) {
  const base = buildCustomerPortalBasePath(token) ?? '/portal'

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4 md:px-6">
      <Link href={base} className="text-sm font-medium text-muted-foreground hover:text-foreground">
        Universal Beverages
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Account">
            <UserCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`${base}/account`}>Account</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  )
}
