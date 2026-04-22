'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import type { Brand } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { BrandChips, GroupByChips, SizeChips } from '@/components/catalog/filter-chips'
import { cn } from '@/lib/utils'

interface FilterPanelProps {
  groupBy: 'brand' | 'size'
  onGroupByChange: (next: 'brand' | 'size') => void
  sizes: string[]
  selectedSizes: string[]
  onSizeToggle: (size: string) => void
  onSizeClear: () => void
  brands: Brand[]
  selectedBrandIds: string[]
  onBrandToggle: (brandId: string) => void
  onBrandClear: () => void
  /** Extra content to render inside the panel, below the chip rows. */
  extra?: ReactNode
}

/**
 * Renders a filter surface in two pieces:
 * - The trigger button (inline with the search input).
 * - A reveal container: desktop slides down as a full-width block below
 *   the trigger row; mobile opens as a right-side drawer.
 *
 * Usage pattern:
 *   <div className="flex items-start gap-2">
 *     <Search …/>
 *     <FilterPanel.Trigger … />
 *   </div>
 *   <FilterPanel.Reveal … />
 *
 * For callers that don't need precise trigger placement, the default
 * export renders both pieces stacked (trigger on its own row, then reveal).
 */

interface UseFilterPanelState {
  activeCount: number
  hasActive: boolean
  desktopOpen: boolean
  setDesktopOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

export function useFilterPanelState(
  selectedSizes: string[],
  selectedBrandIds: string[],
): UseFilterPanelState {
  const [desktopOpen, setDesktopOpenState] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeCount = selectedSizes.length + selectedBrandIds.length
  return {
    activeCount,
    hasActive: activeCount > 0,
    desktopOpen,
    setDesktopOpen: setDesktopOpenState as UseFilterPanelState['setDesktopOpen'],
    mobileOpen,
    setMobileOpen,
  }
}

export function FilterTrigger({
  state,
  className,
}: {
  state: UseFilterPanelState
  className?: string
}) {
  const { activeCount, hasActive, desktopOpen, setDesktopOpen, setMobileOpen } = state
  return (
    <>
      {/* Mobile trigger: opens drawer */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setMobileOpen(true)}
        className={cn('h-9 sm:hidden', className)}
      >
        <SlidersHorizontal className="mr-1.5 h-4 w-4" />
        Filters
        {hasActive && <ActiveBadge count={activeCount} />}
      </Button>

      {/* Desktop trigger: toggles slide-down */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setDesktopOpen((v) => !v)}
        aria-expanded={desktopOpen}
        className={cn('hidden h-9 sm:inline-flex', className)}
      >
        <SlidersHorizontal className="mr-1.5 h-4 w-4" />
        Filters
        {hasActive && <ActiveBadge count={activeCount} />}
        <ChevronDown
          className={cn(
            'ml-1.5 h-3.5 w-3.5 transition-transform',
            desktopOpen && 'rotate-180',
          )}
        />
      </Button>
    </>
  )
}

export function FilterReveal(props: FilterPanelProps & { state: UseFilterPanelState }) {
  const {
    state,
    groupBy,
    onGroupByChange,
    sizes,
    selectedSizes,
    onSizeToggle,
    onSizeClear,
    brands,
    selectedBrandIds,
    onBrandToggle,
    onBrandClear,
    extra,
  } = props

  const body = (
    <div className="space-y-4">
      <GroupByChips groupBy={groupBy} onChange={onGroupByChange} />
      <SizeChips
        sizes={sizes}
        selectedSizes={selectedSizes}
        onToggle={onSizeToggle}
        onClear={onSizeClear}
      />
      <BrandChips
        brands={brands}
        selectedBrandIds={selectedBrandIds}
        onToggle={onBrandToggle}
        onClear={onBrandClear}
      />
      {extra}
    </div>
  )

  return (
    <>
      {/* Mobile drawer */}
      <Sheet open={state.mobileOpen} onOpenChange={state.setMobileOpen}>
        <SheetContent side="right" className="w-full max-w-sm overflow-y-auto p-4">
          <SheetHeader className="mb-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>

      {/* Desktop slide-down */}
      <div
        className={cn(
          'hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out sm:block',
          state.desktopOpen
            ? 'max-h-[60vh] opacity-100'
            : 'pointer-events-none max-h-0 opacity-0',
        )}
        aria-hidden={!state.desktopOpen}
      >
        <div className="max-h-[60vh] overflow-y-auto pb-1 pt-1">{body}</div>
      </div>
    </>
  )
}

function ActiveBadge({ count }: { count: number }) {
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-none text-accent-foreground">
      {count}
    </span>
  )
}

/** Convenience default: trigger on its own row, reveal below. */
export function FilterPanel(props: FilterPanelProps) {
  const state = useFilterPanelState(props.selectedSizes, props.selectedBrandIds)
  return (
    <div className="space-y-3">
      <FilterTrigger state={state} />
      <FilterReveal {...props} state={state} />
    </div>
  )
}
