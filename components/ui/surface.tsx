'use client'

import { cn } from '@/lib/utils'
import { surfaceOverlay } from '@/lib/design/surfaces'

interface SurfaceHeaderProps {
  // When true, render the iOS-style drag handle on small viewports. Set to
  // false for desktop-centered dialogs that don't need a "drag-down to
  // dismiss" affordance.
  showDragHandle?: boolean
  className?: string
  children: React.ReactNode
}

// Glass header band for sheets, popouts, and overlays. Anchors title +
// actions on a translucent strip that reads as the "top edge" of the
// content beneath it.
export function SurfaceHeader({
  showDragHandle = true,
  className,
  children,
}: SurfaceHeaderProps) {
  return (
    <div className={cn('border-b', surfaceOverlay, className)}>
      {showDragHandle && (
        <div className="flex justify-center pt-2 sm:hidden">
          <span
            className="h-1 w-10 rounded-full bg-muted-foreground/30"
            aria-hidden
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-3">{children}</div>
    </div>
  )
}

interface SurfaceFooterProps {
  className?: string
  children: React.ReactNode
}

// Glass footer band — paired counterpart to SurfaceHeader.
export function SurfaceFooter({ className, children }: SurfaceFooterProps) {
  return (
    <div className={cn('space-y-3 border-t px-5 py-4', surfaceOverlay, className)}>
      {children}
    </div>
  )
}
