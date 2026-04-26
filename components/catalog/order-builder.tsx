'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoSavePortal } from '@/lib/hooks/useAutoSavePortal'
import { buildCustomerPortalBasePath } from '@/lib/portal-links'
import type { CatalogProduct, GroupByOption } from '@/lib/types'
import type { Usual } from '@/lib/server/portal-usuals'
import type { ProductFamily } from '@/lib/server/schemas'
import { getProductDisplayName, getProductPackLabel } from '@/lib/utils'
import {
  inOrderCountsByFamily,
  productCountsByFamily,
} from '@/lib/catalog/family-counts'
import { UsualsList } from '@/components/catalog/usuals-list'
import { FamilyCardGrid } from '@/components/catalog/family-card-grid'
import {
  FamilySheet,
  type FamilySheetMode,
} from '@/components/catalog/family-sheet'
import { ProductPopout } from '@/components/catalog/product-popout'
import { CartReviewSurface, type ReviewItem } from '@/components/catalog/cart-review-surface'
import { InlineSearchResults } from '@/components/catalog/inline-search-results'
import { EditableDeliveryDate } from '@/components/catalog/editable-delivery-date'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderBuilderProps {
  token: string
  orderId: string
  deliveryDate: string
  products: CatalogProduct[]
  showPrices: boolean
  // Kept on the props surface for compatibility with the page loader; the new
  // surface always groups inside the FamilySheet, so this is unused for now.
  defaultGroupBy?: GroupByOption
  initialItems: Array<{
    product_id: string | null
    quantity: number
    unit_price: number
  }>
  usuals: Usual[]
}

function productKey(productId: string): string {
  return `product:${productId}`
}

export function OrderBuilder({
  token,
  orderId,
  deliveryDate,
  products,
  showPrices,
  initialItems,
  usuals,
}: OrderBuilderProps) {
  const router = useRouter()
  const basePath = buildCustomerPortalBasePath(token) ?? '/portal'

  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [openProductId, setOpenProductId] = useState<string | null>(null)
  const [sheetState, setSheetState] = useState<FamilySheetMode>({ mode: 'closed' })
  // Page-level search query — typing here narrows the page's content from
  // "usuals + browse" to a flat results grid. No modal; the input is
  // always visible at the top.
  const [pageQuery, setPageQuery] = useState('')
  const isSearching = pageQuery.trim().length > 0

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const item of initialItems) {
      if (!item.product_id) continue
      initial[productKey(item.product_id)] = item.quantity
    }
    return initial
  })

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
    [products],
  )

  const setProductQuantity = (product: CatalogProduct, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [productKey(product.id)]: quantity }))
    save({ productId: product.id, quantity, unitPrice: product.effective_price })
  }

  const productCounts = useMemo(() => productCountsByFamily(products), [products])
  const inOrderCounts = useMemo(
    () => inOrderCountsByFamily(products, quantities),
    [products, quantities],
  )

  const reviewItems = useMemo<ReviewItem[]>(() => {
    return Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([key, quantity]) => {
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
      })
      .filter((entry): entry is ReviewItem => Boolean(entry))
  }, [quantities, productById])

  const totalItems = reviewItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = reviewItems.reduce((sum, item) => sum + item.lineTotal, 0)

  const updateReviewQuantity = (key: string, quantity: number) => {
    const product = productById.get(key.replace('product:', ''))
    if (product) setProductQuantity(product, quantity)
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
        flushError instanceof Error ? flushError.message : 'Failed to save all changes before submit',
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

  const handleSelectFamily = (family: ProductFamily) => {
    setSheetState({ mode: 'family', family })
  }

  return (
    <div className="pb-28">
      <PortalPageHeader
        back={{ href: basePath }}
        title={
          <EditableDeliveryDate
            orderId={orderId}
            token={token}
            deliveryDate={deliveryDate}
          />
        }
      />

      <div className="space-y-6 pt-3">
        {/* Page-level search input — a real input. Click does nothing
            special; typing narrows the page from usuals+browse to a flat
            results grid. Clearing returns to the default page. */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-full border border-foreground/10 bg-background px-4 py-2.5 shadow-sm transition-colors hover:bg-muted/50',
          )}
        >
          <Search className="h-4 w-4 flex-none text-muted-foreground" />
          <input
            type="text"
            value={pageQuery}
            onChange={(event) => setPageQuery(event.target.value)}
            placeholder="Search products"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setPageQuery('')}
              aria-label="Clear search"
              className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isSearching ? (
          <InlineSearchResults
            query={pageQuery}
            products={products}
            quantityFor={(product) => quantities[productKey(product.id)] ?? 0}
            onOpenProduct={(product) => setOpenProductId(product.id)}
            onSetQuantity={setProductQuantity}
          />
        ) : (
          <>
            <UsualsList
              usuals={usuals}
              productById={productById}
              quantities={quantities}
              onSetQuantity={setProductQuantity}
              onOpenProduct={(product) => setOpenProductId(product.id)}
              showPrices={showPrices}
            />

            <FamilyCardGrid
              productCounts={productCounts}
              inOrderCounts={inOrderCounts}
              onSelect={handleSelectFamily}
            />
          </>
        )}
      </div>

      <CartReviewSurface
        open={isReviewOpen}
        onOpenChange={setIsReviewOpen}
        itemCount={totalItems}
        totalValue={totalValue}
        showPrices={showPrices}
        deliveryDate={deliveryDate}
        items={reviewItems}
        error={error}
        isResetting={isResetting}
        isSubmitting={isSubmitting}
        onReset={resetAll}
        onChangeQuantity={updateReviewQuantity}
        onSubmit={submitOrder}
      />

      <FamilySheet
        state={sheetState}
        onStateChange={setSheetState}
        products={products}
        quantityFor={(product) => quantities[productKey(product.id)] ?? 0}
        onOpenProduct={(product) => setOpenProductId(product.id)}
        onSetQuantity={setProductQuantity}
      />

      {statusMessage && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-3 py-1 text-xs text-background">
          {statusMessage}
        </div>
      )}

      <ProductPopout
        product={openProductId ? productById.get(openProductId) ?? null : null}
        quantity={openProductId ? quantities[productKey(openProductId)] ?? 0 : 0}
        onChange={(next) => {
          if (!openProductId) return
          const product = productById.get(openProductId)
          if (product) setProductQuantity(product, next)
        }}
        onOpenChange={(open) => {
          if (!open) setOpenProductId(null)
        }}
        showPrices={showPrices}
      />
    </div>
  )
}
