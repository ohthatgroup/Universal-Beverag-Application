'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Package, Search } from 'lucide-react'
import { useAutoSavePortal } from '@/lib/hooks/useAutoSavePortal'
import { useCatalog, type CatalogTab } from '@/lib/hooks/useCatalog'
import type { CatalogProduct, GroupByOption, PalletDeal } from '@/lib/types'
import { formatCurrency, formatDeliveryDate } from '@/lib/utils'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'

interface OrderBuilderProps {
  token: string
  orderId: string
  deliveryDate: string
  products: CatalogProduct[]
  palletDeals: PalletDeal[]
  showPrices: boolean
  defaultGroupBy: GroupByOption
  initialItems: Array<{
    product_id: string | null
    pallet_deal_id: string | null
    quantity: number
    unit_price: number
  }>
}

function itemKey(productId: string | null, palletDealId: string | null) {
  if (productId) return `product:${productId}`
  return `pallet:${palletDealId}`
}

type ReviewItem = {
  key: string
  label: string
  details: string
  quantity: number
  unitPrice: number
  lineTotal: number
  type: 'product' | 'pallet'
  id: string
}

export function OrderBuilder({
  token,
  orderId,
  deliveryDate,
  products,
  palletDeals,
  showPrices,
  defaultGroupBy,
  initialItems,
}: OrderBuilderProps) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<CatalogTab>('all')
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['__all__']))

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const nextState: Record<string, number> = {}
    for (const item of initialItems) {
      nextState[itemKey(item.product_id, item.pallet_deal_id)] = item.quantity
    }
    return nextState
  })

  const { filters, setFilters, grouped, availableBrands, availableSizes } = useCatalog({
    products,
    activeTab,
    defaultGroupBy: defaultGroupBy === 'size' ? 'size' : 'brand',
  })

  const { save } = useAutoSavePortal({
    orderId,
    token,
    onError: (saveError) => {
      setError(saveError.message)
    },
    onSuccess: () => {
      setStatusMessage('Saved')
      setTimeout(() => setStatusMessage(null), 1000)
    },
  })

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const palletById = useMemo(
    () => new Map(palletDeals.map((palletDeal) => [palletDeal.id, palletDeal])),
    [palletDeals]
  )
  const palletGroups = useMemo(
    () => ({
      single: palletDeals.filter((deal) => deal.pallet_type === 'single'),
      mixed: palletDeals.filter((deal) => deal.pallet_type === 'mixed'),
    }),
    [palletDeals]
  )

  // Initialize expanded groups on first render
  useMemo(() => {
    const keys = new Set<string>()
    for (const group of grouped) keys.add(group.key)
    keys.add('single')
    keys.add('mixed')
    setExpandedGroups(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setProductQuantity = (product: CatalogProduct, quantity: number) => {
    const key = itemKey(product.id, null)
    setQuantities((prev) => ({ ...prev, [key]: quantity }))
    save({ productId: product.id, quantity, unitPrice: product.effective_price })
  }

  const setPalletQuantity = (palletDeal: PalletDeal, quantity: number) => {
    const key = itemKey(null, palletDeal.id)
    setQuantities((prev) => ({ ...prev, [key]: quantity }))
    save({ palletDealId: palletDeal.id, quantity, unitPrice: palletDeal.price })
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const reviewItems = useMemo<ReviewItem[]>(() => {
    return Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([key, quantity]) => {
        if (key.startsWith('product:')) {
          const id = key.replace('product:', '')
          const product = productById.get(id)
          if (!product) return null
          const unitPrice = product.effective_price
          return {
            key, label: product.title, details: product.pack_details ?? '',
            quantity, unitPrice, lineTotal: unitPrice * quantity, type: 'product', id,
          }
        }
        const id = key.replace('pallet:', '')
        const palletDeal = palletById.get(id)
        if (!palletDeal) return null
        const unitPrice = palletDeal.price
        return {
          key, label: palletDeal.title, details: palletDeal.description ?? '',
          quantity, unitPrice, lineTotal: unitPrice * quantity, type: 'pallet', id,
        }
      })
      .filter((item): item is ReviewItem => Boolean(item))
  }, [quantities, productById, palletById])

  const totalItems = reviewItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = reviewItems.reduce((sum, item) => sum + item.lineTotal, 0)

  const updateReviewQuantity = (item: ReviewItem, quantity: number) => {
    if (item.type === 'product') {
      const product = productById.get(item.id)
      if (product) setProductQuantity(product, quantity)
      return
    }
    const pallet = palletById.get(item.id)
    if (pallet) setPalletQuantity(pallet, quantity)
  }

  const resetAll = async () => {
    if (reviewItems.length === 0) return
    setIsResetting(true)
    setError(null)

    const response = await fetch(`/api/portal/orders/${orderId}/items/all`, {
      method: 'DELETE',
      headers: { 'X-Customer-Token': token },
    })

    setIsResetting(false)

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
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
    const response = await fetch(`/api/portal/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Token': token,
      },
      body: JSON.stringify({ status: 'submitted' }),
    })
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    setIsSubmitting(false)
    if (!response.ok) { setError(payload?.error?.message ?? 'Failed to submit order'); return }
    setIsReviewOpen(false)
    router.push(`/c/${token}/orders`)
    router.refresh()
  }

  const tabs = [
    { id: 'new' as const, label: 'New Items' },
    { id: 'pallets' as const, label: 'Pallets' },
    { id: 'all' as const, label: 'All' },
  ]

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/c/${token}/orders`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <span className="text-sm font-medium">{formatDeliveryDate(deliveryDate)}</span>
      </header>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter/search bar - All tab only */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={filters.searchQuery}
              onChange={(event) => setFilters((prev) => ({ ...prev, searchQuery: event.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={filters.brandId ?? 'all'}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, brandId: value === 'all' ? null : value }))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {availableBrands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.sizeFilter ?? 'all'}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, sizeFilter: value === 'all' ? null : value }))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sizes</SelectItem>
                {availableSizes.map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Group:</span>
            <Select
              value={filters.groupBy}
              onValueChange={(value: 'brand' | 'size') => setFilters((prev) => ({ ...prev, groupBy: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Brand</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Product groups - New Items and All tabs */}
      {activeTab !== 'pallets' &&
        grouped.map((group) => {
          const isExpanded = expandedGroups.has(group.key)
          const isCardLayout = activeTab === 'new'

          return (
            <div key={group.key}>
              {/* Collapsible group header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-center gap-2 py-2"
              >
                <Separator className="flex-1" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </span>
                {isExpanded
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <Separator className="flex-1" />
              </button>

              {isExpanded && (
                <div className={isCardLayout
                  ? 'grid gap-3 md:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-px'
                }>
                  {group.products.map((product) => {
                    const key = itemKey(product.id, null)
                    const quantity = quantities[key] ?? 0

                    if (isCardLayout) {
                      return (
                        <div key={product.id} className="rounded-lg border p-3 space-y-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="h-40 w-full rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-40 w-full items-center justify-center rounded-md bg-muted">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">{product.title}</div>
                            <div className="text-xs text-muted-foreground">{product.pack_details ?? 'N/A'}</div>
                            {showPrices && (
                              <div className="mt-1 text-sm">{formatCurrency(product.effective_price)}</div>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <QuantitySelector quantity={quantity} onChange={(value) => setProductQuantity(product, value)} />
                          </div>
                        </div>
                      )
                    }

                    // Compact row layout
                    return (
                      <div key={product.id} className="flex items-center justify-between gap-3 border-b px-1 py-2 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{product.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.pack_details ?? 'N/A'}
                            {showPrices && <> · {formatCurrency(product.effective_price)}</>}
                          </div>
                        </div>
                        <QuantitySelector quantity={quantity} onChange={(value) => setProductQuantity(product, value)} />
                      </div>
                    )
                  })}
                  {group.products.length === 0 && (
                    <div className="py-3 text-sm text-muted-foreground">No products in this group.</div>
                  )}
                </div>
              )}
            </div>
          )
        })}

      {/* Pallets tab */}
      {activeTab === 'pallets' && (
        <div className="space-y-4">
          {palletDeals.length > 0 ? (
            ([
              { label: 'Single Pallets', key: 'single', deals: palletGroups.single },
              { label: 'Mixed Pallets', key: 'mixed', deals: palletGroups.mixed },
            ] as const).map((section) => {
              if (section.deals.length === 0) return null
              const isExpanded = expandedGroups.has(section.key)
              return (
                <div key={section.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.key)}
                    className="flex w-full items-center gap-2 py-2"
                  >
                    <Separator className="flex-1" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.label}
                    </span>
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <Separator className="flex-1" />
                  </button>

                  {isExpanded && (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {section.deals.map((palletDeal) => {
                        const key = itemKey(null, palletDeal.id)
                        const quantity = quantities[key] ?? 0
                        return (
                          <div key={palletDeal.id} className="rounded-lg border p-3 space-y-3">
                            {palletDeal.image_url ? (
                              <img
                                src={palletDeal.image_url}
                                alt={palletDeal.title}
                                className="h-40 w-full rounded-md object-cover"
                              />
                            ) : (
                              <div className="flex h-40 w-full items-center justify-center rounded-md bg-muted">
                                <Package className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold">{palletDeal.title}</div>
                              {palletDeal.description && (
                                <div className="text-xs text-muted-foreground">{palletDeal.description}</div>
                              )}
                              {palletDeal.savings_text && (
                                <div className="text-xs text-emerald-600">{palletDeal.savings_text}</div>
                              )}
                              {showPrices && (
                                <div className="mt-1 text-sm">{formatCurrency(palletDeal.price)}</div>
                              )}
                            </div>
                            <div className="flex justify-end">
                              <QuantitySelector quantity={quantity} onChange={(value) => setPalletQuantity(palletDeal, value)} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="py-4 text-sm text-muted-foreground">No active pallet deals.</div>
          )}
        </div>
      )}

      {/* Sticky review bar */}
      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background p-3 md:bottom-0 md:left-0">
          <div className="mx-auto max-w-4xl">
            <Button className="w-full" size="lg" onClick={() => setIsReviewOpen(true)}>
              Review Order ({totalItems} items)
              {showPrices && <span className="ml-2 opacity-80">· {formatCurrency(totalValue)}</span>}
            </Button>
          </div>
        </div>
      )}

      {/* Review drawer */}
      <Sheet open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <SheetContent side="bottom" className="mx-auto h-[88vh] w-full max-w-lg rounded-t-xl p-0 [&>button.absolute]:hidden">
          <div className="flex h-full flex-col gap-3 p-4">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />

            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Review Order</h2>
                <p className="text-xs text-muted-foreground">{formatDeliveryDate(deliveryDate)}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={resetAll} disabled={isResetting || totalItems === 0}>
                {isResetting ? 'Resetting...' : 'Reset All'}
              </Button>
            </div>

            <div className="flex-1 space-y-0 overflow-y-auto">
              {reviewItems.length > 0 ? (
                reviewItems.map((item, index) => (
                  <div key={item.key}>
                    {index > 0 && <Separator />}
                    <div className="py-3">
                      <div className="font-medium">{item.label}</div>
                      {item.details && <div className="text-xs text-muted-foreground">{item.details}</div>}
                      <div className="mt-2 flex items-center justify-between">
                        {showPrices ? (
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(item.unitPrice)} x {item.quantity}
                          </div>
                        ) : (
                          <div />
                        )}
                        <div className="flex items-center gap-3">
                          {showPrices && <span className="text-sm font-medium">{formatCurrency(item.lineTotal)}</span>}
                          <QuantitySelector quantity={item.quantity} onChange={(value) => updateReviewQuantity(item, value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-sm text-muted-foreground">No items added yet.</div>
              )}
            </div>

            <div className="space-y-3 border-t pt-3">
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex items-center justify-between text-sm">
                <span>{totalItems} items</span>
                {showPrices && <span className="font-semibold">{formatCurrency(totalValue)}</span>}
              </div>
              <Button className="w-full" size="lg" onClick={submitOrder} disabled={totalItems === 0 || isSubmitting}>
                {isSubmitting ? 'Submitting...' : (
                  <>Submit Order <Check className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {statusMessage && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-md bg-foreground px-3 py-1 text-xs text-background">
          {statusMessage}
        </div>
      )}
    </div>
  )
}
