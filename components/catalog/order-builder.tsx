'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { useCatalog, type CatalogTab } from '@/lib/hooks/useCatalog'
import type { CatalogProduct, GroupByOption, PalletDeal } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  const [activeTab, setActiveTab] = useState<CatalogTab>('all')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const reviewItems = useMemo(() => {
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
            type: 'product' as const,
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
          type: 'pallet' as const,
          id,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  }, [quantities, productById, palletById])

  const totalItems = reviewItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = reviewItems.reduce((sum, item) => sum + item.lineTotal, 0)

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

    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null

    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload?.error?.message ?? 'Failed to submit order')
      return
    }

    router.push('/orders')
    router.refresh()
  }

  return (
    <div className="space-y-4 p-4 pb-28">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Order for {deliveryDate}</h1>
        <p className="text-sm text-muted-foreground">Auto-save is enabled on every quantity change.</p>
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

      {activeTab !== 'pallets' && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Input
              placeholder="Search products"
              value={filters.searchQuery}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, searchQuery: event.target.value }))
              }
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filters.brandId ?? 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, brandId: value === 'all' ? null : value }))
                }
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
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, sizeFilter: value === 'all' ? null : value }))
                }
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

            {activeTab === 'all' && (
              <Select
                value={filters.groupBy}
                onValueChange={(value: 'brand' | 'size') =>
                  setFilters((prev) => ({ ...prev, groupBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">Group by brand</SelectItem>
                  <SelectItem value="size">Group by size</SelectItem>
                </SelectContent>
              </Select>
            )}
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
                return (
                  <div key={product.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div>
                      <div className="font-medium">{product.title}</div>
                      <div className="text-xs text-muted-foreground">{product.pack_details ?? 'N/A'}</div>
                      {showPrices && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {formatCurrency(product.effective_price)}
                        </div>
                      )}
                    </div>
                    <QuantitySelector
                      quantity={quantity}
                      onChange={(value) => setProductQuantity(product, value)}
                    />
                  </div>
                )
              })}
              {group.products.length === 0 && (
                <div className="text-sm text-muted-foreground">No products in this group.</div>
              )}
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
              palletDeals.map((palletDeal) => {
                const key = itemKey(null, palletDeal.id)
                const quantity = quantities[key] ?? 0
                return (
                  <div key={palletDeal.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div>
                      <div className="font-medium">{palletDeal.title}</div>
                      <div className="text-xs text-muted-foreground">{palletDeal.description ?? ''}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{palletDeal.pallet_type}</Badge>
                        {palletDeal.savings_text && (
                          <span className="text-xs text-emerald-600">{palletDeal.savings_text}</span>
                        )}
                      </div>
                      {showPrices && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {formatCurrency(palletDeal.price)}
                        </div>
                      )}
                    </div>
                    <QuantitySelector
                      quantity={quantity}
                      onChange={(value) => setPalletQuantity(palletDeal, value)}
                    />
                  </div>
                )
              })
            ) : (
              <div className="text-sm text-muted-foreground">No active pallet deals.</div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="fixed inset-x-0 bottom-16 z-30 mx-auto w-full max-w-mobile rounded-none border-x-0 border-b-0">
        <CardContent className="space-y-3 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Review Order ({totalItems} items)</div>
            {showPrices && <div className="text-sm font-semibold">{formatCurrency(totalValue)}</div>}
          </div>

          <div className="max-h-36 space-y-2 overflow-auto">
            {reviewItems.length > 0 ? (
              reviewItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-sm">
                  <div className="truncate pr-2">
                    {item.label} <span className="text-muted-foreground">x{item.quantity}</span>
                  </div>
                  {showPrices && <div>{formatCurrency(item.lineTotal)}</div>}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No items added yet.</div>
            )}
          </div>

          <Button className="w-full" onClick={submitOrder} disabled={totalItems === 0 || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Order'}
          </Button>

          {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
