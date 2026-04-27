'use client'

import Link from 'next/link'
import { Box, Megaphone, ShoppingCart, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { PromptDrawerProps } from './registry'

interface CreateOption {
  label: string
  description: string
  href: string
  icon: React.ReactNode
}

const OPTIONS: CreateOption[] = [
  {
    label: 'New customer',
    description: 'Create a customer profile and provision their portal link.',
    href: '/admin/customers?create=1',
    icon: <User className="h-4 w-4" />,
  },
  {
    label: 'New order',
    description: 'Pick a customer and a delivery date — opens the draft builder.',
    href: '/admin/orders?create=1',
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    label: 'New announcement / deal',
    description: 'Spin up a deal or homepage announcement.',
    href: '/admin/announcements?create=1',
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    label: 'New product',
    description: 'Add a SKU to the catalog.',
    href: '/admin/catalog?create=1',
    icon: <Box className="h-4 w-4" />,
  },
]

/**
 * Dashboard-only evergreen drawer. A type picker — clicking a row
 * navigates to the target page with `?create=1` so the page opens
 * its own create dialog. (The dialogs themselves stay self-contained;
 * the drawer just routes the salesman to the right one.)
 *
 * Slice 5b extends this with Brands / Staff / Presets options once
 * those drawers exist inside Settings.
 */
export function QuickCreateDrawer({ onClose }: PromptDrawerProps) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            Quick create
          </SheetTitle>
          <SheetDescription className="text-xs">
            Pick what you want to create — we&apos;ll take you straight there.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="space-y-2">
            {OPTIONS.map((option) => (
              <li key={option.href}>
                <Link
                  href={option.href}
                  onClick={onClose}
                  className="group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    aria-hidden
                  >
                    {option.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {option.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t px-5 py-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="ml-auto block"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
