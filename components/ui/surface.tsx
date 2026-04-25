'use client'

import { cn } from '@/lib/utils'

interface SurfaceHeaderProps {
  // When true, render the iOS-style drag handle on small viewports. Set to
  // false for desktop-centered dialogs that don't need a "drag-down to
  // dismiss" affordance.
  showDragHandle?: boolean
  className?: string
  children: React.ReactNode
}

// Header band for sheets and dialogs. Provides the separator line at the
// bottom edge — relies on its parent surface for the background. (Composing
// `surfaceOverlay` here would double-tint nested in a sheet/dialog and
// conflict with the parent's rounded clip.)
export function SurfaceHeader({
  showDragHandle = true,
  className,
  children,
}: SurfaceHeaderProps) {
  return (
    <div className={cn('border-b border-foreground/10', className)}>
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

// Footer band — paired counterpart to SurfaceHeader. Top-edge separator
// only; relies on parent surface for background.
export function SurfaceFooter({ className, children }: SurfaceFooterProps) {
  return (
    <div className={cn('space-y-3 border-t border-foreground/10 px-5 py-4', className)}>
      {children}
    </div>
  )
}
