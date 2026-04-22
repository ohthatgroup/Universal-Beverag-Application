'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Package, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import type { PalletDeal } from '@/lib/types'
import { cn, formatCurrency } from '@/lib/utils'

export interface PalletsRailProps {
  deals: PalletDeal[]
  quantities: Record<string, number>
  onChange: (deal: PalletDeal, next: number) => void
  showPrices: boolean
}

export function PalletsRail({ deals, quantities, onChange, showPrices }: PalletsRailProps) {
  const [dockVisible, setDockVisible] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const past = !entry.isIntersecting && entry.boundingClientRect.top < 0
        setDockVisible(past)
        if (!past) setDropdownOpen(false)
      },
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  if (deals.length === 0) return null

  const totalSavings = deals.reduce((sum, deal) => {
    const match = deal.savings_text?.match(/\$([\d.]+)/)
    return match ? sum + Number(match[1]) : sum
  }, 0)

  const CardsRow = (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6">
      {deals.map((deal) => {
        const qty = quantities[`pallet:${deal.id}`] ?? 0
        const isSingle = deal.pallet_type === 'single'

        return (
          <div
            key={deal.id}
            className="relative flex w-60 flex-none snap-start flex-col overflow-hidden rounded-lg border bg-card shadow-sm"
          >
            {deal.image_url ? (
              <img
                src={deal.image_url}
                alt={deal.title}
                className="h-20 w-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-full items-center justify-center bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1.5 p-2.5">
              {deal.savings_text && (
                <div className="text-sm font-semibold text-accent">{deal.savings_text}</div>
              )}
              <div className="text-sm font-medium leading-snug text-primary underline underline-offset-4 hover:no-underline">
                {deal.title}
              </div>
              {showPrices && (
                <div className="text-xs text-muted-foreground">{formatCurrency(deal.price)}</div>
              )}
              <div className="mt-auto flex justify-end pt-1">
                {isSingle ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={qty > 0 ? 'default' : 'accent'}
                    onClick={() => onChange(deal, qty > 0 ? 0 : 1)}
                  >
                    {qty > 0 ? 'Added' : 'Add pallet'}
                  </Button>
                ) : (
                  <QuantitySelector quantity={qty} onChange={(next) => onChange(deal, next)} />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      {/* In-flow rail, scrolls away naturally */}
      <div className="-mx-4 px-4 pb-4 md:-mx-6 md:px-6">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-h3 font-semibold">
            <Sparkles className="h-4 w-4 text-accent" />
            Save with a pallet
          </h2>
          {totalSavings > 0 && (
            <span className="text-xs text-muted-foreground">
              up to {formatCurrency(totalSavings)} off
            </span>
          )}
        </div>
        {CardsRow}
      </div>
      {/* Sentinel sits at the bottom of the in-flow rail */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {/* Full-width dock bar: fades + slides down when sentinel is above viewport */}
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-30 transition-all duration-200 ease-out',
          dockVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        )}
      >
        <div className={cn('border-b bg-background/95 backdrop-blur', dropdownOpen && 'shadow-sm')}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="pointer-events-auto mx-auto flex w-full max-w-4xl items-center justify-between gap-2 px-4 py-2.5 text-left md:px-6"
        >
          <span className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-semibold">
              {deals.length} pallet {deals.length === 1 ? 'deal' : 'deals'}
            </span>
            {totalSavings > 0 && (
              <span className="text-muted-foreground">
                · Save up to {formatCurrency(totalSavings)}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-accent transition-transform duration-200',
              dropdownOpen && 'rotate-180'
            )}
          />
        </button>
        </div>

        {/* Dropdown overlay: full rail slides down under the dock bar */}
        <div
          className={cn(
            'pointer-events-auto origin-top overflow-hidden border-b bg-background/95 backdrop-blur transition-[max-height,opacity] duration-300 ease-out',
            dropdownOpen ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">{CardsRow}</div>
        </div>
      </div>
    </>
  )
}
