'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { PromptDrawerProps } from './registry'

/**
 * Placeholder for drawerKinds whose real implementation hasn't shipped
 * yet. Renders the prompt as JSON inside a Sheet so slice 3 can verify
 * the dispatch flow end to end. Slice 4 replaces every registered
 * stub with a real drawer.
 */
export function StubDrawer({ prompt, onClose }: PromptDrawerProps) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-3 p-5 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold">
            {prompt.title}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Drawer kind <code className="rounded bg-muted px-1 py-0.5">
              {prompt.action.kind === 'drawer' ? prompt.action.drawerKind : '—'}
            </code> isn&apos;t implemented yet. Slice 4 will replace this stub
            with the real drawer.
          </p>
          <pre className="overflow-auto rounded-md border bg-muted/40 p-3 text-[11px]">
            {JSON.stringify(
              {
                category: prompt.category,
                kind: prompt.kind,
                count: prompt.count,
                cta: prompt.cta,
                action: prompt.action,
                subjects: prompt.subjects,
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
