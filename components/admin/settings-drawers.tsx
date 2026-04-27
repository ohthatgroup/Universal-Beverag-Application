'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface SettingsDrawerShellProps {
  drawerKey: string
  title: string
  description?: string
  children: ReactNode
}

/**
 * Generic drawer shell mounted from the Settings page. Reads
 * `?drawer=<key>` and renders when its `drawerKey` matches. Closing
 * pops `drawer` off the URL.
 */
export function SettingsDrawerShell({
  drawerKey,
  title,
  description,
  children,
}: SettingsDrawerShellProps) {
  const router = useRouter()
  const params = useSearchParams()
  const isOpen = params.get('drawer') === drawerKey

  const close = () => {
    const next = new URLSearchParams(params.toString())
    next.delete('drawer')
    next.delete('id')
    const queryString = next.toString()
    router.replace(queryString ? `?${queryString}` : '?', { scroll: false })
  }

  if (!isOpen) return null

  return (
    <Sheet open onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="border-t px-5 py-3">
          <Button variant="outline" onClick={close} className="ml-auto block">
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Placeholder body for drawers whose CRUD migration lands in 5b. */
export function SettingsDrawerComingSoon({
  href,
}: {
  /** The original standalone-page href; rendered as a fallback link. */
  href: string
}) {
  return (
    <div className="space-y-3 rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      <p>This drawer&apos;s management surface is migrating from the standalone page.</p>
      <p>
        For now, use the existing page:{' '}
        <a href={href} className="font-medium text-foreground underline">
          {href}
        </a>
      </p>
    </div>
  )
}
