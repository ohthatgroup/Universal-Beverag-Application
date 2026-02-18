'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { useCatalog, type CatalogTab } from '@/lib/hooks/useCatalog'
import { createClient } from '@/lib/supabase/client'
import type { CatalogProduct, GroupByOption, PalletDeal } from '@/lib/types'
import { formatCurrency, formatDeliveryDate } from '@/lib/utils'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'

interface OrderBuilderProps {
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
  orderId,
  deliveryDate,
  products,
  palletDeals,
  showPrices,
  defaultGroupBy,
  initialItems,
}: OrderBuilderProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab] = useState<CatalogTab>('all')
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

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

  const { save } = useAutoSave({
    orderId,
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
            key,
            label: product.title,
            details: product.pack_details ?? '',
            quantity,
            unitPrice,
            lineTotal: unitPrice * quantity,
            type: 'product',
            id,
          }
        }

        const id = key.replace('pallet:', '')
        const palletDeal = palletById.get(id)
        if (!palletDeal) return null
        const unitPrice = palletDeal.price
        return {
          key,
          label: palletDeal.title,
          details: palletDeal.description ?? '',
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
          type: 'pallet',
          id,
        }
      })
      .filter((item): item is ReviewItem => Boolean(item))
  }, [quantities, productById, palletById])

  const totalItems = reviewItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = reviewItems.reduce((sum, item) => sum + item.lineTotal, 0)

  const updateReviewQuantity = (item: ReviewItem, quantity: number) => {
    if (item.type === 'product') {
      const product = productById.get(item.id)
      if (!product) return
      setProductQuantity(product, quantity)
      return
    }

    const pallet = palletById.get(item.id)
    if (!pallet) return
    setPalletQuantity(pallet, quantity)
  }

  const resetAll = async () => {
    if (reviewItems.length === 0) {
      return
    }

    setIsResetting(true)
    setError(null)

    const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', orderId)
    setIsResetting(false)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setQuantities({})
    setStatusMessage('Order reset')
    setTimeout(() => setStatusMessage(null), 1200)
  }

  const submitOrder = async () => {
    setIsSubmitting(true)
    setError(null)

    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'submitted' }),
    })

    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null

    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload?.error?.message ?? 'Failed to submit order')
      return
    }

    setIsReviewOpen(false)
    router.push('/orders')
    router.refresh()
  }

  return (
    <div className="space-y-4 p-4 pb-28">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Order - {formatDeliveryDate(deliveryDate)}</h1>
          <p className="text-sm text-muted-foreground">Auto-save is enabled on every quantity change.</p>
        </div>
        <Button asChild type="button" size="sm" variant="ghost">
          <Link href="/orders">Back</Link>
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {(['new', 'pallets', 'all'] as const).map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'new' ? 'New Items' : tab === 'pallets' ? 'Pallets' : 'All'}
          </Button>
        ))}
      </div>

      {activeTab === 'all' && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Input
              placeholder="Search products"
              value={filters.searchQuery}
              onChange={(event) => setFilters((prev) => ({ ...prev, searchQuery: event.target.value }))}
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filters.brandId ?? 'all'}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, brandId: value === 'all' ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.sizeFilter ?? 'all'}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, sizeFilter: value === 'all' ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All sizes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sizes</SelectItem>
                  {availableSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select
              value={filters.groupBy}
              onValueChange={(value: 'brand' | 'size') => setFilters((prev) => ({ ...prev, groupBy: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Group by brand</SelectItem>
                <SelectItem value="size">Group by size</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {activeTab !== 'pallets' &&
        grouped.map((group) => (
          <Card key={group.key}>
            <CardHeader className="py-4">
              <CardTitle className="text-base">{group.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.products.map((product) => {
                const key = itemKey(product.id, null)
                const quantity = quantities[key] ?? 0
                const isCardLayout = activeTab === 'new'

                return (
                  <div
                    key={product.id}
                    className={
                      isCardLayout
                        ? 'space-y-3 rounded-md border p-3'
                        : 'flex items-start justify-between gap-3 rounded-md border p-3'
                    }
                  >
                    {isCardLayout ? (
                      <>
                        <div
                          className="flex h-32 w-full items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
                          style={
                            product.image_url
                              ? {
                                  backgroundImage: `url("${product.image_url}")`,
                                  backgroundPosition: 'center',
                                  backgroundSize: 'cover',
                                }
                              : undefined
                          }
                        >
                          {!product.image_url ? 'No image' : null}
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium">{product.title}</div>
                          <div className="text-xs text-muted-foreground">{product.pack_details ?? 'N/A'}</div>
                          {showPrices && (
                            <div className="text-sm text-muted-foreground">{formatCurrency(product.effective_price)}</div>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <QuantitySelector quantity={quantity} onChange={(value) => setProductQuantity(product, value)} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="font-medium">{product.title}</div>
                          <div className="text-xs text-muted-foreground">{product.pack_details ?? 'N/A'}</div>
                          {showPrices && (
                            <div className="mt-1 text-sm text-muted-foreground">{formatCurrency(product.effective_price)}</div>
                          )}
                        </div>
                        <QuantitySelector quantity={quantity} onChange={(value) => setProductQuantity(product, value)} />
                      </>
                    )}
                  </div>
                )
              })}
              {group.products.length === 0 && <div className="text-sm text-muted-foreground">No products in this group.</div>}
            </CardContent>
          </Card>
        ))}

      {activeTab === 'pallets' && (
        <Card>
          <CardHeader>
            <CardTitle>Pallet Deals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {palletDeals.length > 0 ? (
              ([
                { label: 'Single Pallets', deals: palletGroups.single },
                { label: 'Mixed Pallets', deals: palletGroups.mixed },
              ] as const).map((section) => (
                <section key={section.label} className="space-y-3">
                  {section.deals.length > 0 && (
                    <h3 className="text-sm font-semibold text-muted-foreground">{section.label}</h3>
                  )}
                  {section.deals.map((palletDeal) => {
                const key = itemKey(null, palletDeal.id)
                const quantity = quantities[key] ?? 0
                return (
                  <div key={palletDeal.id} className="space-y-3 rounded-md border p-3">
                    <div
                      className="flex h-32 w-full items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
                      style={
                        palletDeal.image_url
                          ? {
                              backgroundImage: `url("${palletDeal.image_url}")`,
                              backgroundPosition: 'center',
                              backgroundSize: 'cover',
                            }
                          : undefined
                      }
                    >
                      {!palletDeal.image_url ? 'No image' : null}
                    </div>

                    <div>
                      <div className="font-medium">{palletDeal.title}</div>
                      <div className="text-xs text-muted-foreground">{palletDeal.description ?? ''}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{palletDeal.pallet_type}</Badge>
                        {palletDeal.savings_text && <span className="text-xs text-emerald-600">{palletDeal.savings_text}</span>}
                      </div>
                      {showPrices && <div className="mt-1 text-sm text-muted-foreground">{formatCurrency(palletDeal.price)}</div>}
                    </div>

                    <div className="flex justify-end">
                      <QuantitySelector quantity={quantity} onChange={(value) => setPalletQuantity(palletDeal, value)} />
                    </div>
                  </div>
                )
                  })}
                </section>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No active pallet deals.</div>
            )}
          </CardContent>
        </Card>
      )}

      {totalItems > 0 && (
        <Card className="fixed inset-x-0 bottom-16 z-30 mx-auto w-full max-w-mobile rounded-none border-x-0 border-b-0">
          <CardContent className="space-y-2 py-3">
            <Button className="w-full" onClick={() => setIsReviewOpen(true)}>
              Review Order ({totalItems} items)
            </Button>
            {showPrices && <p className="text-center text-xs text-muted-foreground">{formatCurrency(totalValue)}</p>}
          </CardContent>
        </Card>
      )}

      <Sheet open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <SheetContent side="bottom" className="mx-auto h-[88vh] w-full max-w-mobile rounded-t-xl p-0">
          <div className="flex h-full flex-col gap-3 p-4">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />

            <div className="flex items-center justify-between gap-2 pr-8">
              <div>
                <h2 className="text-base font-semibold">Review Order</h2>
                <p className="text-xs text-muted-foreground">{formatDeliveryDate(deliveryDate)}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={resetAll} disabled={isResetting || totalItems === 0}>
                {isResetting ? 'Resetting...' : 'Reset All'}
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {reviewItems.length > 0 ? (
                reviewItems.map((item) => (
                  <div key={item.key} className="space-y-2 rounded-md border p-3">
                    <div className="space-y-1">
                      <div className="font-medium">{item.label}</div>
                      {item.details && <div className="text-xs text-muted-foreground">{item.details}</div>}
                      {showPrices && (
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)} x {item.quantity} = {formatCurrency(item.lineTotal)}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <QuantitySelector quantity={item.quantity} onChange={(value) => updateReviewQuantity(item, value)} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No items added yet.</div>
              )}
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span>{totalItems} items</span>
                {showPrices && <span className="font-semibold">{formatCurrency(totalValue)}</span>}
              </div>
              <Button className="w-full" onClick={submitOrder} disabled={totalItems === 0 || isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Order'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
