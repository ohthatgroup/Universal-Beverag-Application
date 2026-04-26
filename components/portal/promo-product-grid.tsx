'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductTile } from '@/components/catalog/product-tile'
import { Stepper } from '@/components/ui/stepper'
import { ProductPopout } from '@/components/catalog/product-popout'
import { useAutoSavePortal } from '@/lib/hooks/useAutoSavePortal'
import { addDays, todayISODate } from '@/lib/utils'
import type { CatalogProduct } from '@/lib/types'

export interface PromoProduct {
  id: string
  title: string
  brandName: string | null
  packLabel: string | null
  price: number
  imageUrl: string | null
}

interface PromoProductGridProps {
  token: string
  products: PromoProduct[]
  /** product_id → qty in the customer's primary draft (if any). */
  initialQuantities: Record<string, number>
  /** Primary draft id, or null if no draft exists yet (auto-create on first tap). */
  primaryDraftId: string | null
  /**
   * Primary draft delivery date — currently unused inside the grid but
   * available if we want to surface "for delivery May 8" later.
   */
  primaryDraftDate?: string | null
  showPrices: boolean
  /**
   * Whether some of the announcement's referenced product UUIDs failed to
   * resolve (deleted/discontinued products). When true, the grid renders a
   * one-line muted notice above itself.
   */
  hasMissingProducts?: boolean
}

/**
 * Curated product surface for the /portal/[token]/promo/[id] route.
 * Renders a mobile-first grid of `<ProductTile>`s with floating
 * `<Stepper>` overlays. Stepper changes auto-save into the customer's
 * primary draft order; if no draft exists, the first tap auto-creates
 * one for the next-available delivery date.
 */
export function PromoProductGrid({
  token,
  products,
  initialQuantities,
  primaryDraftId: serverDraftId,
  showPrices,
  hasMissingProducts = false,
}: PromoProductGridProps) {
  const router = useRouter()
  const [orderId, setOrderId] = useState<string | null>(serverDraftId)
  const [quantities, setQuantities] =
    useState<Record<string, number>>(initialQuantities)
  const [openProductId, setOpenProductId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Guards against starting the draft-create POST twice when steppers
  // tap-fire in quick succession.
  const draftCreateRef = useRef<Promise<string | null> | null>(null)

  const ensureDraftId = async (): Promise<string | null> => {
    if (orderId) return orderId
    if (draftCreateRef.current) return draftCreateRef.current

    const targetDate = addDays(todayISODate(), 1)
    const promise = (async () => {
      try {
        const response = await fetch('/api/portal/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-Token': token,
          },
          body: JSON.stringify({ deliveryDate: targetDate }),
        })
        const payload = (await response.json().catch(() => null)) as
          | { data?: { order?: { id: string } } }
          | { error?: { message?: string } }
          | null
        if (!response.ok) {
          const message =
            payload && 'error' in payload
              ? payload.error?.message ?? 'Failed to create draft'
              : 'Failed to create draft'
          throw new Error(message)
        }
        const newId =
          payload && 'data' in payload ? payload.data?.order?.id ?? null : null
        if (newId) {
          setOrderId(newId)
          // Refresh so server data (drafts list, navbar) sees the new draft.
          router.refresh()
        }
        return newId
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create draft')
        return null
      } finally {
        draftCreateRef.current = null
      }
    })()
    draftCreateRef.current = promise
    return promise
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {hasMissingProducts && (
        <p className="text-sm text-muted-foreground">
          Some products in this promo are no longer available.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {products.map((product) => {
          const qty = quantities[product.id] ?? 0
          return (
            <PromoTile
              key={product.id}
              product={product}
              quantity={qty}
              showPrices={showPrices}
              orderId={orderId}
              token={token}
              ensureDraftId={ensureDraftId}
              onOpen={() => setOpenProductId(product.id)}
              onChangeQty={(next) =>
                setQuantities((prev) => ({ ...prev, [product.id]: next }))
              }
            />
          )
        })}
      </div>

      <ProductPopout
        product={popoutProductFor(openProductId, products)}
        quantity={openProductId ? quantities[openProductId] ?? 0 : 0}
        onChange={(next) => {
          if (!openProductId) return
          setQuantities((prev) => ({ ...prev, [openProductId]: next }))
        }}
        onOpenChange={(open) => {
          if (!open) setOpenProductId(null)
        }}
        showPrices={showPrices}
      />
    </div>
  )
}

interface PromoTileProps {
  product: PromoProduct
  quantity: number
  showPrices: boolean
  orderId: string | null
  token: string
  ensureDraftId: () => Promise<string | null>
  onOpen: () => void
  onChangeQty: (next: number) => void
}

/**
 * Per-tile wrapper that owns its autosave hook. The hook needs a stable
 * orderId — we render two variants (no-order yet vs has-order) to avoid
 * resetting the hook's debounce timer when the order id transitions
 * from null to a real id.
 */
function PromoTile({
  product,
  quantity,
  showPrices,
  orderId,
  token,
  ensureDraftId,
  onOpen,
  onChangeQty,
}: PromoTileProps) {
  if (orderId) {
    return (
      <ResolvedPromoTile
        product={product}
        quantity={quantity}
        showPrices={showPrices}
        orderId={orderId}
        token={token}
        onOpen={onOpen}
        onChangeQty={onChangeQty}
      />
    )
  }
  return (
    <UnresolvedPromoTile
      product={product}
      quantity={quantity}
      ensureDraftId={ensureDraftId}
      onOpen={onOpen}
      onChangeQty={onChangeQty}
    />
  )
}

function ResolvedPromoTile(
  props: Omit<PromoTileProps, 'ensureDraftId'> & { orderId: string },
) {
  const { product, quantity, orderId, token, onOpen, onChangeQty } = props
  const { save } = useAutoSavePortal({ orderId, token })

  return (
    <ProductTile
      product={asCatalogProduct(product)}
      quantity={quantity}
      onOpen={onOpen}
      overlaySlot={
        <Stepper
          quantity={quantity}
          onChange={(next) => {
            onChangeQty(next)
            save({
              productId: product.id,
              palletDealId: null,
              quantity: next,
              unitPrice: product.price,
            })
          }}
        />
      }
    />
  )
}

function UnresolvedPromoTile({
  product,
  quantity,
  ensureDraftId,
  onOpen,
  onChangeQty,
}: Pick<
  PromoTileProps,
  'product' | 'quantity' | 'ensureDraftId' | 'onOpen' | 'onChangeQty'
>) {
  // First stepper tap on this surface auto-creates the draft, then the
  // tile re-renders with `<ResolvedPromoTile>` which owns the autosave
  // hook. We optimistically bump local qty here; the hook below will
  // pick it up on its first save.
  const [pendingQty, setPendingQty] = useState<number | null>(null)
  const draftIdRef = useRef<string | null>(null)

  // Once the parent's orderId resolves, this component unmounts. So we
  // only need to stash the qty locally and trigger the create.
  const handleStepperChange = async (next: number) => {
    setPendingQty(next)
    onChangeQty(next)
    if (!draftIdRef.current) {
      const id = await ensureDraftId()
      draftIdRef.current = id
    }
  }

  // Mirror the optimistic value if the parent's quantity prop drifts.
  useEffect(() => {
    if (pendingQty !== null && pendingQty !== quantity) {
      setPendingQty(quantity)
    }
  }, [pendingQty, quantity])

  return (
    <ProductTile
      product={asCatalogProduct(product)}
      quantity={quantity}
      onOpen={onOpen}
      overlaySlot={
        <Stepper quantity={quantity} onChange={(next) => void handleStepperChange(next)} />
      }
    />
  )
}

function popoutProductFor(
  openProductId: string | null,
  products: PromoProduct[],
): CatalogProduct | null {
  if (!openProductId) return null
  const product = products.find((p) => p.id === openProductId)
  if (!product) return null
  return asCatalogProduct(product)
}

/**
 * Adapt the lightweight PromoProduct shape to what `<ProductTile>` and
 * `<ProductPopout>` expect (the full CatalogProduct interface).
 */
function asCatalogProduct(p: PromoProduct): CatalogProduct {
  return {
    id: p.id,
    brand_id: null,
    customer_id: null,
    title: p.title,
    pack_details: null,
    pack_count: null,
    size_value: null,
    size_uom: null,
    price: p.price,
    image_url: p.imageUrl,
    is_new: false,
    is_discontinued: false,
    tags: null,
    case_length: null,
    case_width: null,
    case_height: null,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    product_family: 'other',
    browse_model: 'standard',
    subline: null,
    pack_key: null,
    water_type: null,
    price_point: null,
    is_zero_sugar: false,
    is_diet: false,
    is_caffeine_free: false,
    is_sparkling: false,
    search_aliases: null,
    custom_price: null,
    brand: p.brandName
      ? {
          id: 'mock',
          name: p.brandName,
          logo_url: null,
          sort_order: 0,
          created_at: '',
        }
      : undefined,
    effective_price: p.price,
  }
}
