'use client'

import { useMemo, useState } from 'react'
import type { CatalogProduct, Brand } from '@/lib/types'
import { getProductSizeLabel } from '@/lib/utils'

export type CatalogTab = 'pallets' | 'all'
export type GroupBy = 'brand' | 'size'

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

    // Group by unit size only (pack count ignored).
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
    filteredProducts: filtered,
    newItems,
    isFilterActive,
    filteredCount: filtered.length,
    availableBrands,
    availableSizes,
  }
}
