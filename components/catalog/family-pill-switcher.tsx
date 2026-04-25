'use client'

import { useEffect, useRef } from 'react'
import { FAMILIES } from '@/lib/catalog/families'
import type { ProductFamily } from '@/lib/server/schemas'
import { cn } from '@/lib/utils'

interface FamilyPillSwitcherProps {
  activeFamily: ProductFamily | null
  onSelect: (family: ProductFamily) => void
}

// Per-family pill colors. Active = saturated fill; inactive = muted tint.
// Same hue family for both states so the active pill reads as "same family,
// stronger signal" rather than a different element.
const PILL_COLORS: Record<
  ProductFamily,
  { active: string; inactive: string }
> = {
  soda: {
    active: 'bg-red-500 text-white border-red-500',
    inactive: 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100',
  },
  water: {
    active: 'bg-sky-500 text-white border-sky-500',
    inactive: 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100',
  },
  sports_hydration: {
    active: 'bg-emerald-500 text-white border-emerald-500',
    inactive: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
  },
  tea_juice: {
    active: 'bg-amber-500 text-white border-amber-500',
    inactive: 'bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100',
  },
  energy_coffee: {
    active: 'bg-violet-500 text-white border-violet-500',
    inactive: 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100',
  },
  other: {
    active: 'bg-foreground text-background border-foreground',
    inactive: 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80',
  },
}

// Floating pill switcher for the FamilySheet. Renders ABOVE the panel,
// anchored to the page (not the panel), so it sits on top of the glass-blur
// overlay. Each pill shows the family icon + label and is colored by family;
// active pill uses a saturated fill, inactive a muted same-hue tint.
export function FamilyPillSwitcher({
  activeFamily,
  onSelect,
}: FamilyPillSwitcherProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    })
  }, [activeFamily])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3 md:top-4">
      <div className="pointer-events-auto flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FAMILIES.map((family) => {
          const active = family.key === activeFamily
          const colors = PILL_COLORS[family.key]
          const Icon = family.icon
          return (
            <button
              key={family.key}
              ref={active ? activeRef : null}
              type="button"
              onClick={() => onSelect(family.key)}
              aria-pressed={active}
              className={cn(
                'inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors backdrop-blur-md',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                active ? colors.active : colors.inactive,
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-none" />
              <span>{family.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
