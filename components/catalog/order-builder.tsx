'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, Search, Sparkles } from 'lucide-react'
import { useAutoSavePortal } from '@/lib/hooks/useAutoSavePortal'
import { useCatalog } from '@/lib/hooks/useCatalog'
import { buildCustomerPortalBasePath } from '@/lib/portal-links'
import type { CatalogProduct, GroupByOption, PalletDeal } from '@/lib/types'
import type { Usual } from '@/lib/server/portal-usuals'
import {
  cn,
  formatCurrency,
  formatDeliveryDate,
  getProductDisplayName,
  getProductPackLabel,
} from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FilterTriggerAnchored,
  useFilterPanelState,
} from '@/components/catalog/filter-panel'
import { BrowseListGrouped } from '@/components/catalog/browse-list-grouped'
import { CartSummaryBar } from '@/components/catalog/cart-summary-bar'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import { ReviewOrderSheet, type ReviewItem } from '@/components/catalog/review-order-sheet'
import { PalletDetailDialog, type PalletDetailItem } from '@/components/catalog/pallet-detail-dialog'

interface OrderBuilderProps {
  token: string
  orderId: string
  deliveryDate: string
  products: CatalogProduct[]
  palletDeals: PalletDeal[]
  /** Lookup of pallet breakdown items keyed by pallet_deal_id. */
  palletItemsByDealId?: Record<string, PalletDetailItem[]>
  showPrices: boolean
  defaultGroupBy: GroupByOption
  initialItems: Array<{
    product_id: string | null
    pallet_deal_id: string | null
    quantity: number
    unit_price: number
  }>
  productToPalletDealIds: Record<string, string[]>
  usuals: Usual[]
}

function itemKey(productId: string | null, palletDealId: string | null) {
  if (productId) return `product:${productId}`
  return `pallet:${palletDealId}`
}

export function OrderBuilder({
  token,
  orderId,
  deliveryDate,
  products,
  palletDeals,
  palletItemsByDealId,
  showPrices,
  defaultGroupBy,
  initialItems,
  productToPalletDealIds,
  usuals,
}: OrderBuilderProps) {
  const router = useRouter()
  const basePath = buildCustomerPortalBasePath(token) ?? '/portal'

  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [palletDetailId, setPalletDetailId] = useState<string | null>(null)
  const [palletsExpanded, setPalletsExpanded] = useState(true)

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const item of initialItems) {
      initial[itemKey(item.product_id, item.pallet_deal_id)] = item.quantity
    }
    return initial
  })

  const { filters, setFilters, grouped, isFilterActive, availableBrands, availableSizes } =
    useCatalog({
      products,
      defaultGroupBy: defaultGroupBy === 'size' ? 'size' : 'brand',
    })

  const filterPanelState = useFilterPanelState(filters.sizeFilters, filters.brandIds)

  const { save, flush } = useAutoSavePortal({
    orderId,
    token,
    onError: (saveError) => setError(saveError.message),
    onSuccess: () => {
      setStatusMessage('Saved')
      setTimeout(() => setStatusMessage(null), 1000)
    },
  })

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )
  const palletById = useMemo(
    () => new Map(palletDeals.map((deal) => [deal.id, deal])),
    [palletDeals]
  )

  const setProductQuantity = (product: CatalogProduct, quantity: number) => {
    const key = itemKey(product.id, null)
    setQuantities((prev) => ({ ...prev, [key]: quantity }))
    save({ productId: product.id, quantity, unitPrice: product.effective_price })
  }

  const setPalletQuantity = (deal: PalletDeal, quantity: number) => {
    const key = itemKey(null, deal.id)
    setQuantities((prev) => ({ ...prev, [key]: quantity }))
    save({ palletDealId: deal.id, quantity, unitPrice: deal.price })
  }

  const usualProductIds = useMemo(() => new Set(usuals.map((u) => u.productId)), [usuals])

  const browseGroups = useMemo(() => {
    if (isFilterActive) return grouped
    return grouped
      .map((group) => ({
        ...group,
        products: group.products.filter((product) => !usualProductIds.has(product.id)),
      }))
      .filter((group) => group.products.length > 0)
  }, [grouped, isFilterActive, usualProductIds])

  const browseList = useMemo(
    () => browseGroups.flatMap((group) => group.products),
    [browseGroups]
  )

  const hasSearchQuery = filters.searchQuery.trim().length > 0
  const renderFlat = isFilterActive || hasSearchQuery

  const reviewItems = useMemo<ReviewItem[]>(() => {
    return Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([key, quantity]) => {
        if (key.startsWith('product:')) {
          const id = key.replace('product:', '')
          const product = productById.get(id)
          if (!product) return null
          const unitPrice = product.effective_price
          const packLabel = getProductPackLabel(product)
          return {
            key,
            label: getProductDisplayName(product, product.brand?.name ?? null),
            details: packLabel ?? '',
            quantity,
            unitPrice,
            lineTotal: unitPrice * quantity,
          }
        }
        const id = key.replace('pallet:', '')
        const deal = palletById.get(id)
        if (!deal) return null
        const unitPrice = deal.price
        return {
          key,
          label: deal.title,
          details: deal.description ?? '',
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
        }
      })
      .filter((entry): entry is ReviewItem => Boolean(entry))
  }, [quantities, productById, palletById])

  const totalItems = reviewItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = reviewItems.reduce((sum, item) => sum + item.lineTotal, 0)

  const updateReviewQuantity = (key: string, quantity: number) => {
    if (key.startsWith('product:')) {
      const product = productById.get(key.replace('product:', ''))
      if (product) setProductQuantity(product, quantity)
      return
    }
    const deal = palletById.get(key.replace('pallet:', ''))
    if (deal) setPalletQuantity(deal, quantity)
  }

  const resetAll = async () => {
    if (totalItems === 0) return
    setIsResetting(true)
    setError(null)

    const response = await fetch(`/api/portal/orders/${orderId}/items/all`, {
      method: 'DELETE',
      headers: { 'X-Customer-Token': token },
    })

    setIsResetting(false)

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      setError(payload?.error?.message ?? 'Failed to reset order')
      return
    }

    setQuantities({})
    setStatusMessage('Order reset')
    setTimeout(() => setStatusMessage(null), 1200)
  }

  const submitOrder = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await flush()
    } catch (flushError) {
      setIsSubmitting(false)
      setError(
        flushError instanceof Error ? flushError.message : 'Failed to save all changes before submit'
      )
      return
    }

    const response = await fetch(`/api/portal/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Token': token,
      },
      body: JSON.stringify({ status: 'submitted' }),
    })
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null

    setIsSubmitting(false)
    if (!response.ok) {
      setError(payload?.error?.message ?? 'Failed to submit order')
      return
    }
    setIsReviewOpen(false)
    router.push(`${basePath}/orders`)
    router.refresh()
  }

  const showUsuals = !isFilterActive && usuals.length > 0

  return (
    <div className="pb-28 md:pb-8">
      <header className="flex items-center justify-between gap-2 pb-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`${basePath}/orders`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <span className="text-sm font-medium">{formatDeliveryDate(deliveryDate)}</span>
      </header>

      {palletDeals.length > 0 && (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setPalletsExpanded((p) => !p)}
            aria-expanded={palletsExpanded}
            className="flex w-full items-center justify-between gap-2 px-1"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Deals
              <span className="ml-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-accent">
                {palletDeals.length}
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {palletsExpanded ? 'Hide' : 'Show'}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  palletsExpanded && 'rotate-180',
                )}
              />
            </span>
          </button>
          <div
            className={cn(
              'grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out',
              palletsExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
            aria-hidden={!palletsExpanded}
          >
            <div className="min-h-0">
              <ul className="divide-y rounded-xl border bg-card">
                {palletDeals.map((deal) => {
                  const qty = quantities[`pallet:${deal.id}`] ?? 0
                  return (
                    <li key={deal.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setPalletDetailId(deal.id)}
                          className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
                        >
                          {deal.title}
                        </button>
                        <div className="text-xs text-muted-foreground">
                          {deal.savings_text}
                          {showPrices && <> · {formatCurrency(deal.price)}</>}
                        </div>
                      </div>
                      {qty === 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPalletQuantity(deal, 1)}
                        >
                          Add
                        </Button>
                      ) : (
                        <QuantitySelector
                          quantity={qty}
                          onChange={(next) => setPalletQuantity(deal, next)}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      <div className="pt-4">
        {showUsuals ? (
          <div className="divide-y rounded-md border">
            {usuals
              .map((u) => ({ usual: u, product: productById.get(u.productId) }))
              .filter((e) => e.product)
              .map(({ usual, product }) => {
                const p = product!
                const qty = quantities[`product:${p.id}`] ?? 0
                return (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {getProductDisplayName(p, p.brand?.name ?? null)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getProductPackLabel(p) ?? ''}
                        {showPrices && <> · {formatCurrency(p.effective_price)}</>}
                      </div>
                    </div>
                    <QuantitySelector
                      quantity={qty}
                      onChange={(next) => setProductQuantity(p, next)}
                    />
                  </div>
                )
              })}
          </div>
        ) : null}

        <div className="pt-4">
          <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  All products
                </span>
                <span className="text-xs text-muted-foreground">
                  {browseList.length} {browseList.length === 1 ? 'product' : 'products'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-9"
                    value={filters.searchQuery}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, searchQuery: event.target.value }))
                    }
                  />
                </div>
                <FilterTriggerAnchored
                  state={filterPanelState}
                  groupBy={filters.groupBy}
                  onGroupByChange={(groupBy) => setFilters((prev) => ({ ...prev, groupBy }))}
                  sizes={availableSizes}
                  selectedSizes={filters.sizeFilters}
                  onSizeToggle={(size) =>
                    setFilters((prev) => ({
                      ...prev,
                      sizeFilters: prev.sizeFilters.includes(size)
                        ? prev.sizeFilters.filter((s) => s !== size)
                        : [...prev.sizeFilters, size],
                    }))
                  }
                  onSizeClear={() => setFilters((prev) => ({ ...prev, sizeFilters: [] }))}
                  brands={availableBrands}
                  selectedBrandIds={filters.brandIds}
                  onBrandToggle={(brandId) =>
                    setFilters((prev) => ({
                      ...prev,
                      brandIds: prev.brandIds.includes(brandId)
                        ? prev.brandIds.filter((b) => b !== brandId)
                        : [...prev.brandIds, brandId],
                    }))
                  }
                  onBrandClear={() => setFilters((prev) => ({ ...prev, brandIds: [] }))}
                />
              </div>

              <BrowseListGrouped
                groups={browseGroups}
                groupBy={filters.groupBy}
                flat={renderFlat}
                flatProducts={browseList}
                quantityFor={(product) => quantities[`product:${product.id}`] ?? 0}
                onChange={(product, next) => setProductQuantity(product, next)}
                showPrices={showPrices}
                productToPalletDealIds={productToPalletDealIds}
              />
          </section>
        </div>
      </div>

      <CartSummaryBar
        itemCount={totalItems}
        totalValue={totalValue}
        showPrices={showPrices}
        onReview={() => setIsReviewOpen(true)}
      />

      <ReviewOrderSheet
        open={isReviewOpen}
        onOpenChange={setIsReviewOpen}
        deliveryDate={deliveryDate}
        items={reviewItems}
        itemCount={totalItems}
        totalValue={totalValue}
        showPrices={showPrices}
        error={error}
        isResetting={isResetting}
        isSubmitting={isSubmitting}
        onReset={resetAll}
        onChangeQuantity={updateReviewQuantity}
        onSubmit={submitOrder}
      />

      <PalletDetailDialog
        open={palletDetailId !== null}
        onOpenChange={(next) => {
          if (!next) setPalletDetailId(null)
        }}
        deal={palletDetailId ? palletById.get(palletDetailId) ?? null : null}
        items={palletDetailId ? palletItemsByDealId?.[palletDetailId] ?? [] : []}
        showPrices={showPrices}
      />

      {statusMessage && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-md bg-foreground px-3 py-1 text-xs text-background">
          {statusMessage}
        </div>
      )}
    </div>
  )
}
