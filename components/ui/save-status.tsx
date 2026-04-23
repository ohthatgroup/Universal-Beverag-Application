'use client'

import { Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface SaveStatusProps {
  state: SaveState
  onRetry?: () => void
  className?: string
}

export function SaveStatus({ state, onRetry, className }: SaveStatusProps) {
  if (state === 'idle') {
    return <span className={cn('inline-flex min-w-[60px] justify-end text-xs', className)} aria-hidden />
  }

  const base = 'inline-flex min-w-[60px] items-center justify-end gap-1 text-xs'

  if (state === 'saving') {
    return (
      <span className={cn(base, 'text-muted-foreground', className)} role="status" aria-live="polite">
        Saving…
      </span>
    )
  }

  if (state === 'saved') {
    return (
      <span className={cn(base, 'text-success', className)} role="status" aria-live="polite">
        <Check className="h-3 w-3" /> Saved
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onRetry}
      className={cn(base, 'text-destructive hover:underline', className)}
      data-no-row-nav="true"
    >
      <RotateCcw className="h-3 w-3" /> Retry
    </button>
  )
}
