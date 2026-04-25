'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { surfaceFloating } from '@/lib/design/surfaces'

interface SearchTriggerProps {
  onClick: () => void
  label?: string
  className?: string
}

// Canonical "search trigger" used wherever the customer can launch a search.
// Visually a glass pill with a magnifier + label — never an editable input,
// so users don't expect to type in place. Callers wire `onClick` to whatever
// surface owns the actual typing UI (a sheet, a route, an inline expand).
export function SearchTrigger({
  onClick,
  label = 'Search products',
  className,
}: SearchTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-sm text-muted-foreground shadow-sm transition',
        'hover:bg-background/80 focus:outline-none focus:ring-2 focus:ring-ring',
        surfaceFloating,
        className,
      )}
    >
      <Search className="h-4 w-4 flex-none" />
      <span>{label}</span>
    </button>
  )
}
