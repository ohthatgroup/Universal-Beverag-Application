'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { ProductTile } from '@/components/catalog/product-tile'
import { ProductPopout } from '@/components/catalog/product-popout'
import { Stepper } from '@/components/ui/stepper'
import type { Announcement } from '@/components/portal/announcements-stack'
import type { CatalogProduct } from '@/lib/types'
import { cn, getProductPackLabel } from '@/lib/utils'

interface AnnouncementCardProps {
  announcement: Announcement
  token: string
  primaryDraftOrderId: string | null
  showPrices: boolean
  resolvedProduct?: CatalogProduct | null
  resolvedProducts?: CatalogProduct[]
}

export function AnnouncementCard({
  announcement,
  token,
  primaryDraftOrderId,
  showPrices,
  resolvedProduct = null,
  resolvedProducts,
}: AnnouncementCardProps) {
  switch (announcement.content_type) {
    case 'text':
      return <TextCard a={announcement} />
    case 'image':
      return <ImageBannerCard a={announcement} />
    case 'image_text':
      return <ImageTextCard a={announcement} />
    case 'product':
      return (
        <ProductSpotlightCard
          a={announcement}
          product={resolvedProduct}
          token={token}
          primaryDraftOrderId={primaryDraftOrderId}
          showPrices={showPrices}
        />
      )
    case 'specials_grid':
      return (
        <SpecialsGridCard
          a={announcement}
          products={resolvedProducts ?? []}
          showPrices={showPrices}
          badgeOverrides={announcement.badge_overrides}
        />
      )
  }
}

// ---- TextCard -----------------------------------------------------------

function TextCard({ a }: { a: Announcement }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-4">
      {a.title && <p className="text-base font-semibold">{a.title}</p>}
      {a.body && (
        <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
      )}
      {a.cta_label && (
        <div className="mt-3 flex justify-end">
          <a href={a.cta_url ?? '#'} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              {a.cta_label}
            </Button>
          </a>
        </div>
      )}
    </div>
  )
}

// ---- ImageBannerCard ----------------------------------------------------

function ImageBannerCard({ a }: { a: Announcement }) {
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
        {a.cta_label && (
          <a
            href={a.cta_url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
          >
            <Button
              variant="outline"
              size="sm"
              className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              {a.cta_label}
            </Button>
          </a>
        )}
      </div>
    </div>
  )
}

// ---- ImageTextCard ------------------------------------------------------

function ImageTextCard({ a }: { a: Announcement }) {
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
        {a.cta_label && (
          <a
            href={a.cta_url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="mt-1 self-start"
          >
            <Button variant="outline" size="sm">
              {a.cta_label}
            </Button>
          </a>
        )}
      </div>
    </div>
  )
}

// ---- ProductSpotlightCard -----------------------------------------------

function ProductSpotlightCard({
  a,
  product,
  primaryDraftOrderId,
  showPrices,
}: {
  a: Announcement
  product: CatalogProduct | null
  token: string
  primaryDraftOrderId: string | null
  showPrices: boolean
}) {
  // Local quantity state. In mock mode and without a draft, this is just
  // a visual stub — real autosave wiring is a backend task.
  const [qty, setQty] = useState(0)

  const packLabel = product ? getProductPackLabel(product) : null
  const hasDraft = primaryDraftOrderId !== null

  const handleAddPress = () => {
    if (!hasDraft) {
      // TODO: open <Panel variant="bottom-sheet"> date picker — backend task.
      window.alert(
        'Pick a delivery date to start an order. (Date-picker sheet TBD.)',
      )
      return
    }
    setQty(1)
  }

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
            {hasDraft && qty > 0 ? (
              <Stepper quantity={qty} onChange={setQty} size="sm" />
            ) : (
              <Button
                variant="accent"
                size="sm"
                onClick={handleAddPress}
                disabled={!product}
              >
                {a.cta_label ?? 'Add to order'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- SpecialsGridCard ---------------------------------------------------

function SpecialsGridCard({
  a,
  products,
  showPrices,
  badgeOverrides,
}: {
  a: Announcement
  products: CatalogProduct[]
  showPrices: boolean
  badgeOverrides: Record<string, string>
}) {
  const [openProductId, setOpenProductId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const openProduct =
    openProductId !== null
      ? products.find((p) => p.id === openProductId) ?? null
      : null

  const setQty = (productId: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: qty }))
    // TODO: wire up autosave via useAutoSavePortal — backend task.
  }

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
                <ProductTile
                  product={p}
                  quantity={quantities[p.id] ?? 0}
                  onOpen={() => setOpenProductId(p.id)}
                />
              </div>
            ))
          : Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-xl bg-muted"
              />
            ))}
      </div>

      <ProductPopout
        product={openProduct}
        quantity={openProduct ? quantities[openProduct.id] ?? 0 : 0}
        onChange={(next) => {
          if (openProduct) setQty(openProduct.id, next)
        }}
        onOpenChange={(open) => {
          if (!open) setOpenProductId(null)
        }}
        showPrices={showPrices}
      />
    </div>
  )
}
