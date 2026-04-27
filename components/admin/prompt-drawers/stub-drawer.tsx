'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { MomentDrawerProps } from './registry'

/**
 * Placeholder for drawerKinds whose real implementation hasn't shipped
 * yet. Renders the moment as JSON inside a Sheet so the dispatch flow
 * can be verified end to end.
 */
export function StubDrawer({ moment, onClose }: MomentDrawerProps) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-3 p-5 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold">
            {moment.narrative}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Drawer kind <code className="rounded bg-muted px-1 py-0.5">
              {moment.primary.action.kind === 'drawer' ? moment.primary.action.drawerKind : '—'}
            </code> isn&apos;t implemented yet.
          </p>
          <pre className="overflow-auto rounded-md border bg-muted/40 p-3 text-[11px]">
            {JSON.stringify(
              {
                category: moment.category,
                kind: moment.kind,
                weight: moment.weight,
                primary: moment.primary,
                subjects: moment.subjects,
              },
              null,
              2,
            )}
          </pre>
        </div>
        <div className="mt-auto flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
