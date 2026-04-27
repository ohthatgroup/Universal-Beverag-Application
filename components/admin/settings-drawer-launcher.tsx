'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsDrawerLauncherProps {
  drawerKey: string
  label: string
  description?: string
  /** Optional count chip on the right (e.g. number of brands). */
  count?: number | string
  /** When true, renders muted + non-clickable. Used for the Reports
   *  "coming soon" placeholder. */
  comingSoon?: boolean
}

/**
 * Settings hub row — clicking sets `?drawer=<key>` on the URL, which
 * the Settings page interprets and opens the matching drawer. Direct
 * navigation to `/admin/<route>` redirects to this URL via slice 5a's
 * route-redirect plumbing.
 */
export function SettingsDrawerLauncher({
  drawerKey,
  label,
  description,
  count,
  comingSoon = false,
}: SettingsDrawerLauncherProps) {
  const router = useRouter()
  const params = useSearchParams()

  const open = () => {
    if (comingSoon) return
    const next = new URLSearchParams(params.toString())
    next.set('drawer', drawerKey)
    router.replace(`?${next.toString()}`, { scroll: false })
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={comingSoon}
      className={cn(
        'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
        comingSoon
          ? 'cursor-not-allowed text-muted-foreground/70'
          : 'hover:bg-muted/40',
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="truncate text-xs text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        {comingSoon ? (
          <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Coming soon
          </span>
        ) : (
          count !== undefined && (
            <span className="tabular-nums">{count}</span>
          )
        )}
        {!comingSoon && <ChevronRight className="h-4 w-4" />}
      </div>
    </button>
  )
}
