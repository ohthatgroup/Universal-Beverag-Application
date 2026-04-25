'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

type PanelVariant = 'centered' | 'bottom-sheet' | 'side-sheet'
type PanelWidth = 'content' | 'full'

interface PanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: PanelVariant
  // Bottom-sheet/side-sheet only. `content` constrains to max-w-3xl on desktop;
  // `full` is edge-to-edge.
  width?: PanelWidth
  // Bottom-sheet only. Mobile shows the iOS-style drag handle when true.
  showDragHandle?: boolean
  // Override the Radix overlay class. Defaults to glass-blur dim.
  overlayClassName?: string
  // Override the panel content class. Used by `<CartReviewSurface>` to opt out
  // of the standard animation and run a custom transform.
  contentClassName?: string
  // a11y title — required by Radix Dialog. Pass via children's `<Panel.Header>`
  // or via the `srTitle` prop for screen-reader-only titles.
  srTitle?: string
  children: React.ReactNode
}

// Standard panel surface. Three variants:
//
// - `centered`     — popouts and creation forms. Centered on viewport.
// - `bottom-sheet` — review drawer, family sheet. Slides up from bottom.
//                    On desktop, optionally constrained to body width.
// - `side-sheet`   — secondary panels stacked over a bottom-sheet (filters).
//                    Slides in from the right edge.
//
// All three variants share: bg-background, rounded-xl, overflow-hidden,
// border, shadow-2xl, the same overlay, and the same focus trap.
export function Panel({
  open,
  onOpenChange,
  variant = 'centered',
  width = 'content',
  showDragHandle = true,
  overlayClassName,
  contentClassName,
  srTitle,
  children,
}: PanelProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-foreground/30 backdrop-blur-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            overlayClassName,
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden bg-background border border-foreground/10 shadow-2xl outline-none',
            // Variant positioning + animation
            variant === 'centered' && [
              'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-[calc(100vw-1.5rem)] max-w-md rounded-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            ],
            variant === 'bottom-sheet' && [
              'inset-x-0 bottom-0 rounded-t-xl border-t',
              width === 'content' && 'md:max-w-3xl md:mx-auto md:rounded-t-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
              'duration-300 ease-ios-sheet',
            ],
            variant === 'side-sheet' && [
              'inset-y-0 right-0 border-l rounded-l-xl',
              'w-[85vw] max-w-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
              'duration-300 ease-ios-sheet',
            ],
            contentClassName,
          )}
        >
          {srTitle && (
            <DialogPrimitive.Title className="sr-only">{srTitle}</DialogPrimitive.Title>
          )}
          {variant === 'bottom-sheet' && showDragHandle && (
            <div className="flex justify-center pt-2 sm:hidden">
              <span
                className="h-1 w-10 rounded-full bg-muted-foreground/30"
                aria-hidden
              />
            </div>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// Header band for a Panel. Contributes the bottom separator only — the parent
// Panel owns the surface.
function PanelHeader({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex items-center gap-2 border-b border-foreground/10 px-4 py-3', className)}>
      {children}
    </div>
  )
}

// Body slot. Owns the scroll + standard padding. Override via className.
function PanelBody({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn('flex-1 overflow-y-auto', className)}>{children}</div>
}

// Footer band. Top separator only.
function PanelFooter({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-3 border-t border-foreground/10 px-5 py-4', className)}>
      {children}
    </div>
  )
}

Panel.Header = PanelHeader
Panel.Body = PanelBody
Panel.Footer = PanelFooter
