'use client'

import { useMemo, useState } from 'react'
import type { CatalogProduct, Brand } from '@/lib/types'
import { getProductSizeLabel } from '@/lib/utils'

export type CatalogTab = 'pallets' | 'all'
export type GroupBy = 'brand' | 'size' | 'size-brand'

export interface FilterState {
  brandIds: string[]
  sizeFilters: string[]
  searchQuery: string
  groupBy: GroupBy
}

export interface CatalogGroup {
  key: string
  label: string
  products: CatalogProduct[]
}

export interface CatalogSizeBrandGroup {
  key: string
  sizeLabel: string
  sizeSortValue: number
  brandGroups: CatalogGroup[]
}

interface UseCatalogOptions {
  products: CatalogProduct[]
  defaultGroupBy?: GroupBy
}

export function useCatalog({
  products,
  defaultGroupBy = 'brand',
}: UseCatalogOptions) {
  const [filters, setFilters] = useState<FilterState>({
    brandIds: [],
    sizeFilters: [],
    searchQuery: '',
    groupBy: defaultGroupBy,
  })

  // Step 1: Filter by active tab
  const tabFiltered = useMemo<CatalogProduct[]>(() => {
    // 'pallets' tab is handled at the page level (different data source)
    return products
  }, [products])

  // Step 2: Apply search + dropdowns
  const filtered = useMemo<CatalogProduct[]>(() => {
    const brandSet = new Set(filters.brandIds)
    const sizeSet = new Set(filters.sizeFilters)
    return tabFiltered.filter((product) => {
      if (brandSet.size > 0 && !brandSet.has(product.brand_id ?? '')) return false

      const sizeLabel = getProductSizeLabel(product)
      if (sizeSet.size > 0 && !(sizeLabel && sizeSet.has(sizeLabel))) return false

      if (
        filters.searchQuery &&
        !product.title
          .toLowerCase()
          .includes(filters.searchQuery.toLowerCase())
      )
        return false

      return true
    })
  }, [tabFiltered, filters.brandIds, filters.sizeFilters, filters.searchQuery])

  const isFilterActive = filters.brandIds.length > 0 || filters.sizeFilters.length > 0
  const newItems = useMemo(() => filtered.filter((product) => product.is_new), [filtered])
  const productsForGroupedView = useMemo(
    () => (isFilterActive ? filtered : filtered.filter((product) => !product.is_new)),
    [filtered, isFilterActive]
  )

  // Step 3: Group the filtered products
  const grouped = useMemo<CatalogGroup[]>(() => {
    if (isFilterActive) {
      return [{ key: 'filtered', label: 'Filtered Results', products: filtered }]
    }

    if (filters.groupBy === 'brand') {
      const groups = new Map<string, CatalogGroup>()
      for (const product of productsForGroupedView) {
        const brandKey = product.brand_id ?? 'uncategorized'
        const brandLabel = product.brand?.name ?? 'Other'
        if (!groups.has(brandKey)) {
          groups.set(brandKey, { key: brandKey, label: brandLabel, products: [] })
        }
        groups.get(brandKey)!.products.push(product)
      }
      return Array.from(groups.values())
    }

    // For 'size' and 'size-brand' modes: primary key is size label.
    // ('size-brand' also uses the nestedGrouped memo below for its two-level render.)
    const groups = new Map<string, CatalogGroup>()
    for (const product of productsForGroupedView) {
      const sizeKey = getProductSizeLabel(product) ?? 'Other'
      if (!groups.has(sizeKey)) {
        groups.set(sizeKey, { key: sizeKey, label: sizeKey, products: [] })
      }
      groups.get(sizeKey)!.products.push(product)
    }
    return Array.from(groups.values())
  }, [filtered, filters.groupBy, isFilterActive, productsForGroupedView])

  // Nested Size → Brand grouping for the tile-grid layout.
  const nestedGrouped = useMemo<CatalogSizeBrandGroup[]>(() => {
    if (isFilterActive || filters.groupBy !== 'size-brand') return []

    const sizeMap = new Map<string, CatalogSizeBrandGroup>()
    for (const product of productsForGroupedView) {
      const sizeLabel = getProductSizeLabel(product) ?? 'Other'
      const sizeSortValue =
        typeof product.size_value === 'number' && Number.isFinite(product.size_value)
          ? product.size_value
          : Number.POSITIVE_INFINITY

      let sizeGroup = sizeMap.get(sizeLabel)
      if (!sizeGroup) {
        sizeGroup = {
          key: sizeLabel,
          sizeLabel,
          sizeSortValue,
          brandGroups: [],
        }
        sizeMap.set(sizeLabel, sizeGroup)
      } else if (sizeSortValue < sizeGroup.sizeSortValue) {
        sizeGroup.sizeSortValue = sizeSortValue
      }

      const brandKey = product.brand_id ?? 'uncategorized'
      let brandGroup = sizeGroup.brandGroups.find((g) => g.key === brandKey)
      if (!brandGroup) {
        brandGroup = {
          key: brandKey,
          label: product.brand?.name ?? 'Other',
          products: [],
        }
        sizeGroup.brandGroups.push(brandGroup)
      }
      brandGroup.products.push(product)
    }

    // Sort sizes ascending by size_value; fall back to label comparison.
    const result = Array.from(sizeMap.values())
    result.sort((a, b) => {
      if (a.sizeSortValue !== b.sizeSortValue) return a.sizeSortValue - b.sizeSortValue
      return a.sizeLabel.localeCompare(b.sizeLabel)
    })
    // Sort brands within each size alphabetically (brand.sort_order is not available per-group here).
    for (const size of result) {
      size.brandGroups.sort((a, b) => a.label.localeCompare(b.label))
    }
    return result
  }, [filters.groupBy, isFilterActive, productsForGroupedView])

  // Derived: unique brands and sizes for filter dropdowns
  const availableBrands = useMemo<Brand[]>(() => {
    const seen = new Set<string>()
    return tabFiltered
      .filter(
        (p) =>
          p.brand_id &&
          p.brand &&
          !seen.has(p.brand_id) &&
          !!seen.add(p.brand_id)
      )
      .map((p) => p.brand!)
  }, [tabFiltered])

  const availableSizes = useMemo<string[]>(() => {
    const seen = new Set<string>()
    return tabFiltered
      .map((p) => getProductSizeLabel(p))
      .filter(
        (s): s is string => !!s && !seen.has(s) && !!seen.add(s)
      )
  }, [tabFiltered])

  return {
    filters,
    setFilters,
    grouped,
    nestedGrouped,
    filteredProducts: filtered,
    newItems,
    isFilterActive,
    filteredCount: filtered.length,
    availableBrands,
    availableSizes,
  }
}
