'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stepper } from '@/components/ui/stepper'
import {
  addDays,
  cn,
  formatCurrency,
  formatDeliveryDate,
  getProductPackLabel,
  todayISODate,
} from '@/lib/utils'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import type { CatalogProduct } from '@/lib/types'

interface PromoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Title from announcement.title — falls back to "Promotion". */
  title: string
  /** Optional sub-line (announcement.body). */
  subtitle: string | null
  products: CatalogProduct[]
  /** product_id → qty already in the customer's primary draft. */
  initialQuantities: Record<string, number>
  /** Primary draft id. Null → first commit auto-creates a draft for tomorrow. */
  primaryDraftId: string | null
  /** Primary draft delivery date (ISO YYYY-MM-DD). */
  primaryDraftDate: string | null
  showPrices: boolean
  /** Some referenced product UUIDs failed to resolve (deleted/discontinued). */
  hasMissingProducts?: boolean
  token: string
}

/**
 * Bottom-sheet drawer used for every promo on the homepage. Replaces the
 * `/portal/[token]/promo/[id]` route entirely.
 *
 *   1. Reuses the `<CartReviewSurface>` shell — Panel.bottom-sheet with
 *      header, scrollable body, sticky footer with one accent button.
 *   2. Body is a line-item list (image thumbnail + title + pack/price +
 *      stepper) — same horizontal row shape as the cart-review drawer.
 *   3. Steppers mutate LOCAL state only. Bulk-save fires on the footer
 *      button.
 *   4. Stateful footer button:
 *        - 0 selected → "Select products…" (muted, disabled)
 *        - 1+ selected, has draft → "Added items {N}/{M} — Continue to order page?"
 *        - 1+ selected, no draft → "Added items {N}/{M} — Start a {Day} order?"
 *   5. Tapping the footer button bulk-saves all non-zero quantities into
 *      the primary draft (creating one if needed) and routes the customer
 *      to the order builder for that draft.
 *   6. Closing the drawer without committing discards the local selection.
 *      No warning needed — nothing was sent to the server.
 */
export function PromoSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  products,
  initialQuantities,
  primaryDraftId,
  primaryDraftDate,
  showPrices,
  hasMissingProducts = false,
  token,
}: PromoSheetProps) {
  const router = useRouter()
  // Local selection map. Seeded from the primary draft on every open so the
  // customer sees their existing quantities and can adjust without losing
  // them.
  const [quantities, setQuantities] =
    useState<Record<string, number>>(initialQuantities)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(open)

  // Reset selection state when the drawer (re)opens. Without this, opening
  // → adjusting → closing → reopening would leak the old selection.
  useEffect(() => {
    if (open) {
      setMounted(true)
      setQuantities(initialQuantities)
      setError(null)
      setIsSubmitting(false)
    }
  }, [open, initialQuantities])

  // Keep the dialog mounted briefly during the close animation.
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setTimeout(() => setMounted(false), 320)
    }
  }

  // Selection counter — number of tiles with qty > 0.
  const { selectedCount, totalCount } = useMemo(() => {
    let selected = 0
    for (const product of products) {
      if ((quantities[product.id] ?? 0) > 0) selected += 1
    }
    return { selectedCount: selected, totalCount: products.length }
  }, [products, quantities])

  // The date the order will be delivered on. Has-draft → use that draft's
  // date. No-draft → tomorrow (matches the `ensureDraftId` fallback).
  const targetDate =
    primaryDraftDate ?? addDays(todayISODate(), 1)

  // "Tuesday" / "Thursday" / etc. for the no-draft button copy.
  const targetDayName = useMemo(() => {
    try {
      const date = new Date(targetDate + 'T00:00:00')
      return date.toLocaleDateString('en-US', { weekday: 'long' })
    } catch {
      return null
    }
  }, [targetDate])

  // Stateful footer-button label — see the wireframe for the contract.
  const buttonLabel = (() => {
    if (selectedCount === 0) return 'Select products…'
    const progress = `Added items ${selectedCount}/${totalCount}`
    if (primaryDraftId) {
      return `${progress} — Continue to order page?`
    }
    if (targetDayName) {
      return `${progress} — Start a ${targetDayName} order?`
    }
    return `${progress} — Start a new order?`
  })()

  // Guards against double-submits.
  const submitGuardRef = useRef(false)

  const handleCommit = async () => {
    if (submitGuardRef.current) return
    if (selectedCount === 0) return
    submitGuardRef.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      // Step 1 — ensure we have a draft id. Has-draft → use it. No-draft →
      // create one for tomorrow.
      let orderId = primaryDraftId
      if (!orderId) {
        const createResponse = await fetch('/api/portal/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-Token': token,
          },
          body: JSON.stringify({ deliveryDate: targetDate }),
        })
        const createPayload = (await createResponse.json().catch(() => null)) as
          | { data?: { order?: { id: string } } }
          | { error?: { message?: string } }
          | null
        if (!createResponse.ok) {
          throw new Error(
            (createPayload && 'error' in createPayload
              ? createPayload.error?.message
              : null) ?? 'Could not start an order',
          )
        }
        orderId =
          (createPayload && 'data' in createPayload
            ? createPayload.data?.order?.id
            : null) ?? null
        if (!orderId) {
          throw new Error('Could not start an order')
        }
      }

      // Step 2 — bulk-save every non-zero qty in parallel. The items PUT
      // endpoint upserts one product per call.
      const productById = new Map(products.map((p) => [p.id, p]))
      const writes = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(async ([productId, qty]) => {
          const product = productById.get(productId)
          if (!product) return
          const response = await fetch(
            `/api/portal/orders/${orderId}/items`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-Customer-Token': token,
              },
              body: JSON.stringify({
                productId,
                palletDealId: null,
                quantity: qty,
                unitPrice: product.effective_price,
              }),
            },
          )
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as
              | { error?: { message?: string } }
              | null
            throw new Error(
              body?.error?.message ?? `Failed to save ${product.title}`,
            )
          }
        })
      await Promise.all(writes)

      // Step 3 — close the drawer and route into the order builder.
      onOpenChange(false)
      const href = buildCustomerOrderDeepLink(token, orderId)
      if (href) router.push(href)
      else router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your items')
    } finally {
      submitGuardRef.current = false
      setIsSubmitting(false)
    }
  }

  if (!open && !mounted) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-foreground/30 backdrop-blur-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex h-[80dvh] flex-col overflow-hidden border border-foreground/10 bg-background shadow-2xl outline-none',
            'rounded-t-xl md:max-w-3xl md:mx-auto md:bottom-4 md:inset-x-4 md:rounded-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            'duration-300 ease-ios-sheet',
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {title}
          </DialogPrimitive.Title>

          {/* Drag handle (mobile only) */}
          <div className="flex justify-center pt-2 sm:hidden">
            <span
              className="h-1 w-10 rounded-full bg-muted-foreground/30"
              aria-hidden
            />
          </div>

          {/* Header */}
          <div className="flex items-center gap-2 border-b border-foreground/10 px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold leading-tight">
                {title}
              </div>
              <div className="text-xs text-muted-foreground">
                {totalCount} {totalCount === 1 ? 'product' : 'products'}
                {primaryDraftDate
                  ? ` · for ${formatDeliveryDate(primaryDraftDate)}`
                  : ''}
                {!primaryDraftDate && targetDayName
                  ? ` · ${targetDayName} delivery`
                  : ''}
              </div>
              {subtitle && (
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {subtitle}
                </div>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Body — line-item list (matches <CartReviewSurface>'s shape).
              Each row: small thumbnail, title + pack/price, stepper on the
              right. Per-product `quantity_locked` from badge_overrides is
              respected — locked rows render the qty as a static chip
              instead of a stepper. */}
          <div className="flex-1 overflow-y-auto">
            {hasMissingProducts && (
              <p className="px-5 pt-3 text-xs text-muted-foreground">
                Some products in this promo are no longer available.
              </p>
            )}
            {products.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                No products available right now.
              </p>
            ) : (
              <ul className="divide-y">
                {products.map((product) => {
                  const qty = quantities[product.id] ?? 0
                  const packLabel = getProductPackLabel(product)
                  const lineTotal = qty * product.effective_price
                  return (
                    <li key={product.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        {/* Tiny thumbnail keeps the line scannable without
                            stealing space from the title. */}
                        <div className="h-12 w-12 flex-none overflow-hidden rounded-md bg-white">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt=""
                              className="h-full w-full object-contain p-0.5"
                            />
                          ) : (
                            <div className="h-full w-full bg-muted" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-sm font-semibold leading-tight">
                            {product.title}
                          </div>
                          {packLabel && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {packLabel}
                            </div>
                          )}
                          {showPrices && (
                            <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                              {formatCurrency(product.effective_price)}
                              {qty > 0 && (
                                <>
                                  {' × '}
                                  {qty}
                                  <span className="ml-1.5 font-semibold text-foreground">
                                    = {formatCurrency(lineTotal)}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-none">
                          <Stepper
                            quantity={qty}
                            onChange={(next) =>
                              setQuantities((prev) => ({
                                ...prev,
                                [product.id]: next,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="space-y-3 border-t border-foreground/10 px-5 py-4">
            {error && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={handleCommit}
              disabled={selectedCount === 0 || isSubmitting}
              className="h-12 w-full justify-between gap-3 rounded-xl text-sm"
            >
              <span className="line-clamp-2 text-left text-sm font-semibold leading-tight">
                {isSubmitting ? 'Saving…' : buttonLabel}
              </span>
              {selectedCount > 0 && !isSubmitting && (
                <ArrowRight className="h-4 w-4 shrink-0" />
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
