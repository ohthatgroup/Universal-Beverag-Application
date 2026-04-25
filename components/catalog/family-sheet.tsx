'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { ProductTile } from '@/components/catalog/product-tile'
import { Stepper } from '@/components/ui/stepper'
import { BrandChips, SizeChips } from '@/components/catalog/filter-chips'
import { FilterChip } from '@/components/ui/filter-chip'
import { SurfaceHeader } from '@/components/ui/surface'
import { EmptyState } from '@/components/ui/empty-state'
import { FAMILIES, getFamilyDefinition } from '@/lib/catalog/families'
import type { CatalogProduct, Brand } from '@/lib/types'
import type { ProductFamily } from '@/lib/server/schemas'
import {
  cn,
  getProductSizeLabel,
} from '@/lib/utils'

export type FamilySheetMode =
  | { mode: 'closed' }
  | { mode: 'family'; family: ProductFamily }
  | { mode: 'search' }

interface FamilySheetProps {
  state: FamilySheetMode
  onStateChange: (next: FamilySheetMode) => void
  products: CatalogProduct[]
  quantityFor: (product: CatalogProduct) => number
  onOpenProduct: (product: CatalogProduct) => void
  onSetQuantity: (product: CatalogProduct, next: number) => void
}

const TILE_GRID_CLASSES = 'grid grid-cols-3 gap-1.5 md:grid-cols-5'

export function FamilySheet({
  state,
  onStateChange,
  products,
  quantityFor,
  onOpenProduct,
  onSetQuantity,
}: FamilySheetProps) {
  const isOpen = state.mode !== 'closed'
  const isFamilyMode = state.mode === 'family'
  const isSearchMode = state.mode === 'search'

  const activeFamily = isFamilyMode ? state.family : null

  // Filters live inside the sheet — they reset on family switch and on close.
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // Family-mode-only: an inline search input expands when the user taps the
  // 🔍 icon. Stays open until cleared. Doesn't swap modes — it just narrows
  // the family-mode grid.
  const [inlineSearchOpen, setInlineSearchOpen] = useState(false)
  const [inlineQuery, setInlineQuery] = useState('')

  // Reset filters when family changes or the sheet closes.
  useEffect(() => {
    setSelectedBrandIds([])
    setSelectedSizes([])
    setFilterPanelOpen(false)
    setInlineSearchOpen(false)
    setInlineQuery('')
  }, [activeFamily, isOpen])

  // Clear the search-mode typed query whenever we leave search mode.
  useEffect(() => {
    if (!isSearchMode) setSearchQuery('')
  }, [isSearchMode])

  // Auto-focus the appropriate input on open.
  const searchInputRef = useRef<HTMLInputElement>(null)
  const inlineSearchInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!isSearchMode) return
    const id = setTimeout(() => searchInputRef.current?.focus(), 80)
    return () => clearTimeout(id)
  }, [isSearchMode])
  useEffect(() => {
    if (!inlineSearchOpen) return
    const id = setTimeout(() => inlineSearchInputRef.current?.focus(), 80)
    return () => clearTimeout(id)
  }, [inlineSearchOpen])

  // Family-mode product list: filter to active family, then apply chip
  // filters, then the inline search if any.
  const familyProducts = useMemo<CatalogProduct[]>(() => {
    if (!activeFamily) return []
    const brandSet = new Set(selectedBrandIds)
    const sizeSet = new Set(selectedSizes)
    const q = inlineQuery.trim().toLowerCase()
    return products.filter((product) => {
      if (product.product_family !== activeFamily) return false
      if (brandSet.size > 0 && !brandSet.has(product.brand_id ?? '')) return false
      if (sizeSet.size > 0) {
        const sizeLabel = getProductSizeLabel(product)
        if (!sizeLabel || !sizeSet.has(sizeLabel)) return false
      }
      if (q && !product.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [activeFamily, products, selectedBrandIds, selectedSizes, inlineQuery])

  // Filter chip options sourced from the unfiltered family slice so curators
  // can still see + toggle filters that would yield zero results in the
  // current intersection.
  const familySlice = useMemo<CatalogProduct[]>(() => {
    if (!activeFamily) return []
    return products.filter((product) => product.product_family === activeFamily)
  }, [activeFamily, products])

  const familyBrands = useMemo<Brand[]>(() => {
    const seen = new Set<string>()
    const out: Brand[] = []
    for (const product of familySlice) {
      if (!product.brand_id || !product.brand) continue
      if (seen.has(product.brand_id)) continue
      seen.add(product.brand_id)
      out.push(product.brand)
    }
    out.sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [familySlice])

  const familySizes = useMemo<string[]>(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const product of familySlice) {
      const label = getProductSizeLabel(product)
      if (!label || seen.has(label)) continue
      seen.add(label)
      out.push(label)
    }
    return out
  }, [familySlice])

  // Search-mode product list: title contains the (lowercased) query, grouped
  // by family for orientation labels.
  const searchSections = useMemo<Array<{ family: ProductFamily; label: string; products: CatalogProduct[] }>>(() => {
    const trimmed = searchQuery.trim().toLowerCase()
    if (!trimmed) return []
    const matches = products.filter((product) =>
      product.title.toLowerCase().includes(trimmed),
    )
    const sectionMap = new Map<ProductFamily, CatalogProduct[]>()
    for (const product of matches) {
      const family = (product.product_family as ProductFamily) ?? 'other'
      if (!sectionMap.has(family)) sectionMap.set(family, [])
      sectionMap.get(family)!.push(product)
    }
    return FAMILIES.flatMap((family) => {
      const list = sectionMap.get(family.key)
      return list && list.length > 0
        ? [{ family: family.key, label: family.label, products: list }]
        : []
    })
  }, [products, searchQuery])

  const onOpenChange = (next: boolean) => {
    if (!next) onStateChange({ mode: 'closed' })
  }

  const familyDef = activeFamily ? getFamilyDefinition(activeFamily) : null
  const useNestedSizeBrand = familyDef?.defaultGroupBy === 'size-brand'

  // size→brand grouping for Soda + Water family-mode rendering.
  const sizeBrandGroups = useMemo(() => {
    if (!useNestedSizeBrand) return []
    interface BrandBucket {
      key: string
      label: string
      products: CatalogProduct[]
    }
    interface SizeBucket {
      label: string
      sortValue: number
      brands: Map<string, BrandBucket>
    }
    const sizeMap = new Map<string, SizeBucket>()
    for (const product of familyProducts) {
      const sizeLabel = getProductSizeLabel(product) ?? 'Other'
      const sortValue =
        typeof product.size_value === 'number' && Number.isFinite(product.size_value)
          ? product.size_value
          : Number.POSITIVE_INFINITY
      let bucket = sizeMap.get(sizeLabel)
      if (!bucket) {
        bucket = { label: sizeLabel, sortValue, brands: new Map() }
        sizeMap.set(sizeLabel, bucket)
      } else if (sortValue < bucket.sortValue) {
        bucket.sortValue = sortValue
      }
      const brandKey = product.brand_id ?? 'uncategorized'
      const brandLabel = product.brand?.name ?? 'Other'
      let brandBucket = bucket.brands.get(brandKey)
      if (!brandBucket) {
        brandBucket = { key: brandKey, label: brandLabel, products: [] }
        bucket.brands.set(brandKey, brandBucket)
      }
      brandBucket.products.push(product)
    }
    return Array.from(sizeMap.values())
      .sort((a, b) => a.sortValue - b.sortValue || a.label.localeCompare(b.label))
      .map((bucket) => ({
        sizeLabel: bucket.label,
        brandGroups: Array.from(bucket.brands.values()).sort((a, b) =>
          a.label.localeCompare(b.label),
        ),
      }))
  }, [familyProducts, useNestedSizeBrand])

  // brand-only grouping for Sports/Tea/Energy/Other family-mode rendering.
  const brandGroups = useMemo(() => {
    if (useNestedSizeBrand) return []
    const map = new Map<string, { key: string; label: string; products: CatalogProduct[] }>()
    for (const product of familyProducts) {
      const key = product.brand_id ?? 'uncategorized'
      const label = product.brand?.name ?? 'Other'
      let bucket = map.get(key)
      if (!bucket) {
        bucket = { key, label, products: [] }
        map.set(key, bucket)
      }
      bucket.products.push(product)
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [familyProducts, useNestedSizeBrand])

  const filtersActive = selectedBrandIds.length + selectedSizes.length > 0

  const goToFamily = (family: ProductFamily) => onStateChange({ mode: 'family', family })

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        // Override default close-button placement (we render our own) and let
        // the sheet take 92dvh so a sliver of page peeks above it.
        className="flex h-[92dvh] flex-col gap-0 p-0 [&>button]:hidden"
      >
        {/* Visually hidden title for a11y — Radix requires it. */}
        <SheetTitle className="sr-only">
          {isSearchMode ? 'Search products' : familyDef?.label ?? 'Products'}
        </SheetTitle>

        <SurfaceHeader>
          <button
            type="button"
            onClick={() => onStateChange({ mode: 'closed' })}
            aria-label="Close"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {isFamilyMode && familyDef && (
            <>
              {/* When the inline-search input is open it expands into the
                  flex-1 slot. Otherwise the slot is empty (the active pill
                  in the switcher below carries the "you are here" signal). */}
              {inlineSearchOpen ? (
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={inlineSearchInputRef}
                    placeholder={`Search ${familyDef.label}…`}
                    className="pl-9"
                    value={inlineQuery}
                    onChange={(event) => setInlineQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        setInlineQuery('')
                        setInlineSearchOpen(false)
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="min-w-0 flex-1" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => {
                  if (inlineSearchOpen) {
                    setInlineQuery('')
                    setInlineSearchOpen(false)
                  } else {
                    setInlineSearchOpen(true)
                  }
                }}
                aria-label={inlineSearchOpen ? 'Close search' : 'Search'}
                aria-pressed={inlineSearchOpen}
                className={cn(
                  'flex h-9 w-9 flex-none items-center justify-center rounded-md hover:bg-muted',
                  inlineSearchOpen
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setFilterPanelOpen((open) => !open)}
                aria-label="Filters"
                aria-pressed={filterPanelOpen}
                className={cn(
                  'flex h-9 w-9 flex-none items-center justify-center rounded-md hover:bg-muted',
                  filtersActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </>
          )}

          {isSearchMode && (
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search products..."
                className="pl-9"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          )}
        </SurfaceHeader>

        {/* Pill switcher (family mode only). The active pill auto-scrolls
            into view so the user always sees where they are even after a
            family change shifts the visible window. */}
        {isFamilyMode && (
          <div className="border-t">
            <div className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FAMILIES.map((family) => {
                const active = family.key === activeFamily
                return (
                  <span
                    key={family.key}
                    ref={(node) => {
                      if (active && node) {
                        node.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
                      }
                    }}
                  >
                    <FilterChip active={active} onClick={() => goToFamily(family.key)}>
                      {family.label}
                    </FilterChip>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Filter panel (family mode + open) */}
        {isFamilyMode && filterPanelOpen && (
          <div className="border-t bg-muted/30 px-4 py-3">
            <div className="space-y-3">
              <SizeChips
                sizes={familySizes}
                selectedSizes={selectedSizes}
                onToggle={(size) =>
                  setSelectedSizes((prev) =>
                    prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
                  )
                }
                onClear={() => setSelectedSizes([])}
              />
              <BrandChips
                brands={familyBrands}
                selectedBrandIds={selectedBrandIds}
                onToggle={(brandId) =>
                  setSelectedBrandIds((prev) =>
                    prev.includes(brandId)
                      ? prev.filter((b) => b !== brandId)
                      : [...prev, brandId],
                  )
                }
                onClear={() => setSelectedBrandIds([])}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3">
          {isFamilyMode && familyProducts.length === 0 && (
            <EmptyState
              title="No products match"
              description="Try clearing a filter."
            />
          )}

          {isFamilyMode && useNestedSizeBrand && sizeBrandGroups.length > 0 && (
            <div className="space-y-5">
              {sizeBrandGroups.map((size) => (
                <section key={size.sizeLabel}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground/80">
                    {size.sizeLabel}
                  </h3>
                  {/* Brand sub-headings dropped — each tile shows its brand
                      chip; the tiles auto-cluster by brand thanks to the
                      sort, so a redundant text label adds noise. */}
                  <div className={TILE_GRID_CLASSES}>
                    {size.brandGroups.flatMap((brand) =>
                      brand.products.map((product) => (
                        <ProductTile
                          key={product.id}
                          product={product}
                          quantity={quantityFor(product)}
                          onOpen={() => onOpenProduct(product)}
                          overlaySlot={
                            <Stepper
                              quantity={quantityFor(product)}
                              onChange={(next) => onSetQuantity(product, next)}
                            />
                          }
                        />
                      )),
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}

          {isFamilyMode && !useNestedSizeBrand && brandGroups.length > 0 && (
            <div className="space-y-5">
              {brandGroups.map((brand) => (
                <section key={brand.key}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground/80">
                    {brand.label}
                  </h3>
                  <div className={TILE_GRID_CLASSES}>
                    {brand.products.map((product) => (
                      <ProductTile
                        key={product.id}
                        product={product}
                        quantity={quantityFor(product)}
                        onOpen={() => onOpenProduct(product)}
                        overlaySlot={
                          <Stepper
                            quantity={quantityFor(product)}
                            onChange={(next) => onSetQuantity(product, next)}
                          />
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {isSearchMode && searchQuery.trim().length === 0 && (
            <div className="flex h-full items-center justify-center pb-12 text-center">
              <div className="text-sm text-muted-foreground">Type to search.</div>
            </div>
          )}

          {isSearchMode && searchQuery.trim().length > 0 && searchSections.length === 0 && (
            <EmptyState
              title="No matches"
              description={`No products match "${searchQuery.trim()}".`}
            />
          )}

          {isSearchMode && searchSections.length > 0 && (
            <div className="space-y-5">
              {searchSections.map((section) => (
                <section key={section.family}>
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" aria-hidden />
                    <span>{section.label}</span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                  </div>
                  <div className={TILE_GRID_CLASSES}>
                    {section.products.map((product) => (
                      <ProductTile
                        key={product.id}
                        product={product}
                        quantity={quantityFor(product)}
                        onOpen={() => onOpenProduct(product)}
                        overlaySlot={
                          <Stepper
                            quantity={quantityFor(product)}
                            onChange={(next) => onSetQuantity(product, next)}
                          />
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
