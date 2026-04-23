'use client'

import { cn } from '@/lib/utils'

interface CustomerTagFilterStripProps {
  allTags: string[]
  active: string[]
  onChange: (next: string[]) => void
}

export function CustomerTagFilterStrip({
  allTags,
  active,
  onChange,
}: CustomerTagFilterStripProps) {
  if (allTags.length === 0) return null

  const toggle = (tag: string) => {
    onChange(active.includes(tag) ? active.filter((t) => t !== tag) : [...active, tag])
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allTags.map((tag) => {
        const isActive = active.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={isActive}
            onClick={() => toggle(tag)}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border bg-muted/50 text-foreground hover:bg-muted'
            )}
          >
            {tag}
          </button>
        )
      })}
      {active.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
