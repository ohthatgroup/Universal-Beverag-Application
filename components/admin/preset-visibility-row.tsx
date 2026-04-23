'use client'

import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface PresetVisibilityRowProps {
  label: string
  sub?: string
  pinned?: boolean
  hidden?: boolean
  showPin?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  disabled?: boolean
  onTogglePin?: (next: boolean) => void
  onToggleHide?: (next: boolean) => void
}

export function PresetVisibilityRow({
  label,
  sub,
  pinned = false,
  hidden = false,
  showPin = true,
  leading,
  trailing,
  disabled = false,
  onTogglePin,
  onToggleHide,
}: PresetVisibilityRowProps) {
  return (
    <li className={cn('flex items-center gap-3 px-3 py-2.5', hidden && 'opacity-60')}>
      {leading ? <div className="shrink-0">{leading}</div> : null}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
        {sub ? (
          <div className="truncate text-xs text-muted-foreground">{sub}</div>
        ) : null}
      </div>

      {showPin ? (
        <button
          type="button"
          aria-label={pinned ? 'Unpin' : 'Pin'}
          aria-pressed={pinned}
          disabled={disabled}
          onClick={() => onTogglePin?.(!pinned)}
          className={cn(
            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted',
            pinned ? 'text-amber-500' : 'text-muted-foreground'
          )}
        >
          <Star className="h-4 w-4" fill={pinned ? 'currentColor' : 'none'} />
        </button>
      ) : null}

      <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={hidden}
          className="peer sr-only"
          disabled={disabled}
          onChange={(event) => onToggleHide?.(event.target.checked)}
          aria-label={hidden ? 'Show' : 'Hide'}
        />
        <span className="h-5 w-9 rounded-full bg-input transition-colors peer-checked:bg-primary" />
        <span className="absolute left-[2px] h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
      </label>

      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </li>
  )
}
