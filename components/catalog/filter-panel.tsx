'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
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
 * Filter surface rendered as an overlay on all breakpoints — never pushes
 * surrounding content.
 * - Desktop (sm+): anchored drawer that expands downward from under the
 *   trigger button, using absolute positioning inside a relative wrapper.
 * - Mobile (<sm): right-side Sheet drawer.
 */

export interface FilterPanelState {
  activeCount: number
  hasActive: boolean
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
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
    toggle: () => setOpen(!open),
  }
}

/**
 * Renders the Filters button + anchored desktop drawer + mobile sheet.
 * Caller must wrap the trigger area in `relative` so the desktop drawer
 * positions under the button. The `FilterTriggerWrapper` helper does this.
 */
export function FilterTrigger({
  state,
  className,
}: {
  state: FilterPanelState
  className?: string
}) {
  const { activeCount, hasActive, open, setOpen, toggle } = state

  // Mobile (<sm) opens the sheet; desktop (sm+) toggles the anchored drawer.
  // We branch by matching viewport at click-time via a data attribute.
  return (
    <>
      {/* Mobile trigger: opens sheet */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn('h-9 sm:hidden', className)}
      >
        <SlidersHorizontal className="mr-1.5 h-4 w-4" />
        Filters
        {hasActive && <ActiveBadge count={activeCount} />}
      </Button>

      {/* Desktop trigger: toggles anchored drawer */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggle}
        aria-expanded={open}
        className={cn('hidden h-9 sm:inline-flex', className)}
      >
        <SlidersHorizontal className="mr-1.5 h-4 w-4" />
        Filters
        {hasActive && <ActiveBadge count={activeCount} />}
      </Button>
    </>
  )
}

/**
 * Wrap the trigger button in this to anchor the desktop drawer under it.
 * Place this component where you want the Filters button; the desktop
 * drawer renders as an overlay beneath it.
 */
export function FilterTriggerAnchored(
  props: FilterPanelProps & { state: FilterPanelState; triggerClassName?: string },
) {
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
    triggerClassName,
  } = props

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  // Track viewport so the portaled mobile Sheet only activates on <sm. The
  // Sheet's full-screen overlay would otherwise block all interaction on
  // desktop because `sm:hidden` on content doesn't suppress the portaled
  // overlay's click capture.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(min-width: 640px)')
    const update = () => setIsDesktop(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  // Close desktop drawer on outside click or Escape.
  useEffect(() => {
    if (!state.open || !isDesktop) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && wrapperRef.current && !wrapperRef.current.contains(target)) {
        state.setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') state.setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [state, isDesktop])

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
    <div ref={wrapperRef} className="relative">
      <FilterTrigger state={state} className={triggerClassName} />

      {/* Desktop anchored drawer — absolute overlay, does not push content */}
      <div
        className={cn(
          'absolute right-0 top-full z-40 mt-2 hidden w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card shadow-lg transition-[max-height,opacity] duration-200 ease-out sm:block',
          state.open
            ? 'max-h-[60vh] opacity-100'
            : 'pointer-events-none max-h-0 opacity-0',
        )}
        aria-hidden={!state.open}
      >
        <div className="max-h-[60vh] overflow-y-auto p-4">{body}</div>
      </div>

      {/* Mobile sheet overlay — only rendered on <sm to avoid the Radix
          portal's full-screen overlay swallowing clicks on desktop. */}
      {!isDesktop && (
        <Sheet open={state.open} onOpenChange={state.setOpen}>
          <SheetContent
            side="right"
            className="w-full max-w-sm overflow-y-auto p-4"
          >
            <SheetHeader className="mb-4">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            {body}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

/**
 * @deprecated use FilterTriggerAnchored instead. Kept for back-compat with
 * callers that rendered FilterTrigger and FilterReveal as separate pieces.
 */
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

/** Convenience default: renders the anchored trigger+drawer. */
export function FilterPanel(props: FilterPanelProps) {
  const state = useFilterPanelState(props.selectedSizes, props.selectedBrandIds)
  return <FilterTriggerAnchored {...props} state={state} />
}
