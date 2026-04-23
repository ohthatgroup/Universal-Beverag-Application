'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

export interface ConfirmSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  pendingLabel?: string
  pending?: boolean
  destructive?: boolean
  onConfirm: () => void
}

/**
 * Confirmation primitive.
 *
 * - Mobile (`<md`): bottom-sheet (Sheet side="bottom") with glass blur.
 * - Desktop (`>=md`): centered AlertDialog.
 *
 * Use for any "are you sure" interaction — delete, discard, destructive toggles.
 * Replaces ad-hoc `window.confirm` calls throughout admin surfaces.
 */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  pendingLabel,
  pending = false,
  destructive = true,
  onConfirm,
}: ConfirmSheetProps) {
  const isMobile = useIsMobile()
  const resolvedConfirmLabel = pending ? pendingLabel ?? `${confirmLabel}…` : confirmLabel
  const confirmClasses = destructive
    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
    : ''

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
          <SheetFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? 'destructive' : 'default'}
              onClick={onConfirm}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {resolvedConfirmLabel}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="w-auto" disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={`w-auto ${confirmClasses}`}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
            disabled={pending}
          >
            {resolvedConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
