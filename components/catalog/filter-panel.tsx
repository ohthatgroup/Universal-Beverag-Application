'use client'

import { useState, type ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
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
 * Filter surface rendered as a drawer overlay on all breakpoints.
 * Never pushes surrounding content — the drawer floats above the page.
 *
 * Split into two pieces so callers can place the trigger inline with a
 * search input and render the drawer alongside the page content.
 */

export interface FilterPanelState {
  activeCount: number
  hasActive: boolean
  open: boolean
  setOpen: (v: boolean) => void
}

export function useFilterPanelState(
  selectedSizes: string[],
  selectedBrandIds: string[],
): FilterPanelState {
  const [open, setOpen] = useState(false)
  const activeCount = selectedSizes.length + selectedBrandIds.length
  return {
    activeCount,
    hasActive: activeCount > 0,
    open,
    setOpen,
  }
}

export function FilterTrigger({
  state,
  className,
}: {
  state: FilterPanelState
  className?: string
}) {
  const { activeCount, hasActive, setOpen } = state
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setOpen(true)}
      className={cn('h-9', className)}
    >
      <SlidersHorizontal className="mr-1.5 h-4 w-4" />
      Filters
      {hasActive && <ActiveBadge count={activeCount} />}
    </Button>
  )
}

export function FilterReveal(props: FilterPanelProps & { state: FilterPanelState }) {
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

  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto p-4">
        <SheetHeader className="mb-4">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
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
      </SheetContent>
    </Sheet>
  )
}

function ActiveBadge({ count }: { count: number }) {
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-none text-accent-foreground">
      {count}
    </span>
  )
}

/** Convenience default: trigger + drawer. */
export function FilterPanel(props: FilterPanelProps) {
  const state = useFilterPanelState(props.selectedSizes, props.selectedBrandIds)
  return (
    <>
      <FilterTrigger state={state} />
      <FilterReveal {...props} state={state} />
    </>
  )
}
