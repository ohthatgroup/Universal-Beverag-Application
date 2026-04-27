'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { MomentDrawerProps } from './registry'

/**
 * Directory drawer — no batch action, no inline edit. Each row links
 * to the customer's edit page with the missing field auto-focused.
 *
 * The customer-edit form supports `?focus=<field>` (slice 5c
 * enhancement). The sublabel encodes which field is missing.
 */
export function CustomersMissingInfoDrawer({
  moment,
  onClose,
}: MomentDrawerProps) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            {moment.narrative}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Click a customer to fill the missing info on their edit page.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="divide-y rounded-md border">
            {moment.subjects.map((subject) => {
              const focus = pickFocusField(subject.sublabel)
              const href = `/admin/customers/${subject.id}/edit${focus ? `?focus=${focus}` : ''}`
              return (
                <li key={subject.id}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40"
                    onClick={onClose}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {subject.label}
                      </div>
                      {subject.sublabel && (
                        <div className="truncate text-[11px] text-muted-foreground">
                          {subject.sublabel}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              )
            })}
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

/** Picks the first missing-field token to focus on the edit page. */
function pickFocusField(sublabel?: string): string | null {
  if (!sublabel) return null
  if (sublabel.includes('contact')) return 'contact_name'
  if (sublabel.includes('phone')) return 'phone'
  if (sublabel.includes('portal link')) return 'portal'
  return null
}
