'use client'

import { useState, type ReactNode } from 'react'
import { Money } from '@/components/ui/money'
import { PromoSheet } from '@/components/portal/promo-sheet'
import type { Announcement } from '@/components/portal/announcements-stack'
import type { CatalogProduct } from '@/lib/types'
import { cn, getProductPackLabel } from '@/lib/utils'

/**
 * Wraps an editorial card body so the entire surface is the click target.
 *
 * Three modes based on the announcement's CTA destination:
 *   - drawer products available → tap opens `<PromoSheet>` with those
 *     products. CTA button (when present) just rides along visually.
 *   - `cta_target_kind === 'url'` → tap opens the URL in a new tab.
 *   - otherwise → no click handler, card is informational.
 */
function CardSurface({
  announcement,
  token,
  primaryDraftOrderId,
  primaryDraftDate,
  showPrices,
  drawerProducts,
  drawerHasMissing,
  initialQuantitiesByProductId,
  className,
  children,
}: {
  announcement: Announcement
  token: string
  primaryDraftOrderId: string | null
  primaryDraftDate: string | null
  showPrices: boolean
  drawerProducts: CatalogProduct[] | null
  drawerHasMissing: boolean
  initialQuantitiesByProductId: Record<string, number>
  className?: string
  children: ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const kind = announcement.cta_target_kind

  // Drawer mode — most common: any text/image/image_text card with a
  // product CTA gets the drawer.
  if (drawerProducts && drawerProducts.length > 0) {
    const initialForDrawer: Record<string, number> = {}
    for (const p of drawerProducts) {
      const qty = initialQuantitiesByProductId[p.id] ?? 0
      if (qty > 0) initialForDrawer[p.id] = qty
    }
    return (
      <>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={cn(
            'block w-full cursor-pointer text-left transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          {children}
        </button>
        <PromoSheet
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={announcement.title ?? 'Promotion'}
          subtitle={announcement.body ?? null}
          products={drawerProducts}
          initialQuantities={initialForDrawer}
          productQuantities={announcement.product_quantities}
          primaryDraftId={primaryDraftOrderId}
          primaryDraftDate={primaryDraftDate}
          showPrices={showPrices}
          hasMissingProducts={drawerHasMissing}
          token={token}
        />
      </>
    )
  }

  // URL-target — open the URL in a new tab. No drawer.
  if (kind === 'url' && announcement.cta_target_url) {
    return (
      <a
        href={announcement.cta_target_url}
        target="_blank"
        rel="noreferrer"
        className={cn('block w-full', className)}
      >
        {children}
      </a>
    )
  }

  // No CTA — informational card, plain wrapper.
  return <div className={className}>{children}</div>
}

interface AnnouncementCardProps {
  announcement: Announcement
  token: string
  primaryDraftOrderId: string | null
  primaryDraftDate?: string | null
  showPrices: boolean
  resolvedProduct?: CatalogProduct | null
  resolvedProducts?: CatalogProduct[]
  drawerProducts?: CatalogProduct[] | null
  drawerHasMissing?: boolean
  initialQuantitiesByProductId?: Record<string, number>
}

export function AnnouncementCard({
  announcement,
  token,
  primaryDraftOrderId,
  primaryDraftDate = null,
  showPrices,
  resolvedProduct = null,
  resolvedProducts,
  drawerProducts = null,
  drawerHasMissing = false,
  initialQuantitiesByProductId = {},
}: AnnouncementCardProps) {
  const surfaceProps = {
    announcement,
    token,
    primaryDraftOrderId,
    primaryDraftDate,
    showPrices,
    drawerProducts,
    drawerHasMissing,
    initialQuantitiesByProductId,
  }

  switch (announcement.content_type) {
    case 'text':
      return (
        <CardSurface {...surfaceProps}>
          <TextCardBody a={announcement} />
        </CardSurface>
      )
    case 'image':
      return (
        <CardSurface {...surfaceProps}>
          <ImageBannerCardBody a={announcement} />
        </CardSurface>
      )
    case 'image_text':
      return (
        <CardSurface {...surfaceProps}>
          <ImageTextCardBody a={announcement} />
        </CardSurface>
      )
    case 'product':
      return (
        <CardSurface {...surfaceProps}>
          <ProductSpotlightCardBody
            a={announcement}
            product={resolvedProduct}
            showPrices={showPrices}
          />
        </CardSurface>
      )
    case 'specials_grid':
      return (
        <CardSurface {...surfaceProps}>
          <SpecialsGridCardBody
            a={announcement}
            products={resolvedProducts ?? []}
            showPrices={showPrices}
            badgeOverrides={announcement.badge_overrides}
          />
        </CardSurface>
      )
  }
}

// ---- TextCardBody -------------------------------------------------------

function TextCardBody({ a }: { a: Announcement }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-4">
      {a.title && <p className="text-base font-semibold">{a.title}</p>}
      {a.body && (
        <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
      )}
      {a.cta_label && a.cta_target_kind && (
        <div className="mt-3 flex justify-end">
          <span className="pointer-events-none inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium">
            {a.cta_label}
          </span>
        </div>
      )}
    </div>
  )
}

// ---- ImageBannerCardBody ------------------------------------------------

function ImageBannerCardBody({ a }: { a: Announcement }) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {a.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={a.image_url}
          alt={a.title ?? ''}
          className="aspect-[16/7] w-full object-cover"
        />
      ) : (
        <div className="aspect-[16/7] w-full bg-muted" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-4 pb-4 pt-12">
        {a.title && (
          <span className="text-base font-semibold text-white">{a.title}</span>
        )}
        {a.cta_label && a.cta_target_kind && (
          <span className="pointer-events-none inline-flex h-9 shrink-0 items-center rounded-md border border-white/50 bg-transparent px-3 text-sm font-medium text-white">
            {a.cta_label}
          </span>
        )}
      </div>
    </div>
  )
}

// ---- ImageTextCardBody --------------------------------------------------

function ImageTextCardBody({ a }: { a: Announcement }) {
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4 md:flex-row md:items-center">
      <div className="shrink-0 md:w-[40%]">
        {a.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.image_url}
            alt={a.title ?? ''}
            className="aspect-[16/9] w-full rounded-lg object-cover md:aspect-square"
          />
        ) : (
          <div className="aspect-[16/9] w-full rounded-lg bg-muted md:aspect-square" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        {a.title && <p className="text-base font-semibold">{a.title}</p>}
        {a.body && (
          <p className="text-sm text-muted-foreground">{a.body}</p>
        )}
        {a.cta_label && a.cta_target_kind && (
          <span className="pointer-events-none mt-1 inline-flex h-9 items-center self-start rounded-md border border-input bg-background px-3 text-sm font-medium">
            {a.cta_label}
          </span>
        )}
      </div>
    </div>
  )
}

// ---- ProductSpotlightCardBody -------------------------------------------
//
// Visual-only — clicking the card opens `<PromoSheet>` with the single
// resolved product (handled by `<CardSurface>`). Customer adjusts qty +
// commits there.

function ProductSpotlightCardBody({
  a,
  product,
  showPrices,
}: {
  a: Announcement
  product: CatalogProduct | null
  showPrices: boolean
}) {
  const packLabel = product ? getProductPackLabel(product) : null

  return (
    <div className="rounded-xl border-2 border-accent/30 bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
        ★ Featured product
      </p>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="shrink-0 md:w-[45%]">
          {product?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.title}
              className="aspect-square w-full rounded-lg bg-white object-contain"
            />
          ) : (
            <div className="aspect-square w-full rounded-lg bg-muted" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <p className="text-base font-semibold">
            {product ? product.title : 'Product not found'}
          </p>
          {product && (packLabel || showPrices) && (
            <p className="text-sm text-muted-foreground">
              {packLabel}
              {packLabel && showPrices && ' · '}
              {showPrices && (
                <Money
                  value={product.effective_price}
                  className="font-normal"
                />
              )}
            </p>
          )}
          {a.body && (
            <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
          )}

          <div className="mt-3 flex justify-end">
            <span className="pointer-events-none inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground">
              {a.cta_label ?? 'Add to order'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- SpecialsGridCardBody ----------------------------------------------
//
// Visual preview tiles only. Tapping anywhere on the card opens
// `<PromoSheet>` with all the products (handled by `<CardSurface>`).
// Steppers and ProductPopout live inside the drawer.

function SpecialsGridCardBody({
  a,
  products,
  badgeOverrides,
}: {
  a: Announcement
  products: CatalogProduct[]
  showPrices: boolean
  badgeOverrides: Record<string, string>
}) {
  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
      <p className="mb-2 text-sm font-semibold text-accent">
        ★ {a.title ?? 'Specials this week'}
      </p>

      <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
        {products.length > 0
          ? products.map((p) => (
              <div key={p.id} className="relative">
                {badgeOverrides[p.id] && (
                  <span
                    className={cn(
                      'absolute left-1 top-1 z-10 rounded bg-accent px-1 text-[9px] font-bold text-white',
                    )}
                  >
                    {badgeOverrides[p.id]}
                  </span>
                )}
                {/* Static thumbnail — no interactivity here; the drawer
                    handles steppers and popouts. */}
                <div className="aspect-[4/5] overflow-hidden rounded-xl bg-white">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
              </div>
            ))
          : Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-xl bg-muted"
              />
            ))}
      </div>
    </div>
  )
}
