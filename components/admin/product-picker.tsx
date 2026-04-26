'use client'

import { useMemo, useState } from 'react'
import { Check, Lock, LockOpen, Plus, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Money } from '@/components/ui/money'
import { cn } from '@/lib/utils'

export interface PickerProduct {
  id: string
  title: string
  brandName: string | null
  packLabel: string | null
  price: number
  imageUrl: string | null
}

/**
 * Per-product preselection authored by the salesman. Optional — when the
 * picker isn't given a `quantities` prop (e.g. CTA destination picker), no
 * controls render and the form just collects ids.
 */
export interface PickerQuantity {
  default_qty?: number
  locked?: boolean
}

interface BaseProps {
  products: PickerProduct[]
  /** Max rows to render at a time (search filters to this). Default 50. */
  visibleLimit?: number
  /**
   * When provided, each selected product gets a default-qty input + a lock
   * toggle below its chip. Map keyed by product id.
   */
  quantities?: Record<string, PickerQuantity>
  /** Update handler for `quantities` — mirrors the value/onChange pattern. */
  onChangeQuantities?: (next: Record<string, PickerQuantity>) => void
}

interface SingleProps extends BaseProps {
  mode: 'single'
  value: string | null
  onChange: (next: string | null) => void
}

interface MultiProps extends BaseProps {
  mode: 'multi'
  value: string[]
  onChange: (next: string[]) => void
}

type ProductPickerProps = SingleProps | MultiProps

/**
 * Search-as-you-type product picker for the admin announcements dialog.
 * Two modes: 'single' (radio-like; sets cta_target_product_id) or
 * 'multi' (checkbox-like; sets cta_target_product_ids).
 *
 * Fully client-side over a list passed by the parent — no API calls.
 */
export function ProductPicker(props: ProductPickerProps) {
  const { products, visibleLimit = 50, quantities, onChangeQuantities } = props
  const [query, setQuery] = useState('')

  // Per-chip qty/lock controls only render when both `quantities` and
  // `onChangeQuantities` are passed. Caller convention: pass either both or
  // neither.
  const showQtyControls = Boolean(quantities && onChangeQuantities)

  const setQuantity = (productId: string, next: PickerQuantity) => {
    if (!quantities || !onChangeQuantities) return
    const updated = { ...quantities }
    // Treat empty/zero/no-lock as "remove the override" so we don't persist
    // a noisy `{}` for every selected product.
    const qty = next.default_qty
    const locked = next.locked
    if ((qty === undefined || qty === 0) && !locked) {
      delete updated[productId]
    } else {
      updated[productId] = {
        ...(qty !== undefined && qty > 0 ? { default_qty: qty } : {}),
        ...(locked ? { locked: true } : {}),
      }
    }
    onChangeQuantities(updated)
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return products.slice(0, visibleLimit)
    const list = products.filter((p) => {
      const haystack = [p.title, p.brandName, p.packLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
    return list.slice(0, visibleLimit)
  }, [products, query, visibleLimit])

  const selectedIds =
    props.mode === 'single'
      ? new Set<string>(props.value ? [props.value] : [])
      : new Set<string>(props.value)

  const isSelected = (id: string) => selectedIds.has(id)

  const toggle = (id: string) => {
    if (props.mode === 'single') {
      props.onChange(props.value === id ? null : id)
      return
    }
    const next = new Set(props.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    props.onChange(Array.from(next))
  }

  // For multi-mode: render selected chips at the top so the salesman sees
  // their picks even when they scroll/search through the long list.
  const selectedProducts =
    props.mode === 'multi'
      ? props.value
          .map((id) => products.find((p) => p.id === id))
          .filter((p): p is PickerProduct => Boolean(p))
      : []

  // For single mode, show controls for the selected product right above
  // the search input.
  const singleSelectedProduct =
    props.mode === 'single' && props.value
      ? products.find((p) => p.id === props.value) ?? null
      : null

  return (
    <div className="space-y-2">
      {props.mode === 'multi' && selectedProducts.length > 0 && (
        <div className="space-y-1.5 rounded-lg border bg-muted/30 px-2 py-2">
          {showQtyControls ? (
            <ul className="space-y-1.5">
              {selectedProducts.map((p) => (
                <SelectedProductRow
                  key={p.id}
                  product={p}
                  quantity={quantities?.[p.id]}
                  onChange={(next) => setQuantity(p.id, next)}
                  onRemove={() => toggle(p.id)}
                />
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/90"
                >
                  <span className="max-w-[14ch] truncate">{p.title}</span>
                  <X className="h-3 w-3 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {props.mode === 'single' && singleSelectedProduct && showQtyControls && (
        <div className="rounded-lg border bg-muted/30 px-2 py-2">
          <SelectedProductRow
            product={singleSelectedProduct}
            quantity={quantities?.[singleSelectedProduct.id]}
            onChange={(next) => setQuantity(singleSelectedProduct.id, next)}
            onRemove={() => props.onChange(null)}
          />
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
          {query.trim()
            ? 'No products match your search.'
            : 'No products available.'}
        </p>
      ) : (
        <ul className="max-h-72 divide-y divide-foreground/10 overflow-y-auto rounded-md border bg-background">
          {filtered.map((p) => {
            const selected = isSelected(p.id)
            const meta =
              [p.brandName, p.packLabel].filter(Boolean).join(' · ') || null
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    selected ? 'bg-accent/10' : 'hover:bg-muted/40',
                  )}
                >
                  <PickerThumb product={p} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate font-medium">{p.title}</div>
                    {meta && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {meta} · <Money value={p.price} className="font-normal" />
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
                      selected
                        ? 'bg-accent text-accent-foreground'
                        : 'border text-muted-foreground',
                    )}
                  >
                    {selected ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * One selected-product row inside the chip rail. Renders the thumbnail +
 * title, a small numeric default-qty input, a lock toggle, and an X to
 * remove. Only used when `quantities` is wired through.
 */
function SelectedProductRow({
  product,
  quantity,
  onChange,
  onRemove,
}: {
  product: PickerProduct
  quantity: PickerQuantity | undefined
  onChange: (next: PickerQuantity) => void
  onRemove: () => void
}) {
  const defaultQty = quantity?.default_qty ?? 0
  const locked = quantity?.locked ?? false

  return (
    <li className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
      <PickerThumb product={product} />
      <div className="min-w-0 flex-1 text-xs">
        <div className="truncate font-medium">{product.title}</div>
        {product.packLabel && (
          <div className="truncate text-muted-foreground">
            {product.packLabel}
          </div>
        )}
      </div>

      {/* Default qty — preselected quantity the customer will see in the
          drawer's stepper for this product. 0 = no preselect. */}
      <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="hidden sm:inline">Qty</span>
        <Input
          type="number"
          min={0}
          max={9999}
          value={defaultQty || ''}
          onChange={(e) => {
            const next = Number(e.target.value)
            onChange({
              default_qty: Number.isFinite(next) && next >= 0 ? next : 0,
              locked,
            })
          }}
          placeholder="0"
          className="h-7 w-14 px-1.5 text-center text-xs"
        />
      </label>

      {/* Lock toggle — when on, the customer can't adjust qty in the
          drawer. The default_qty becomes the committed quantity. */}
      <button
        type="button"
        onClick={() => onChange({ default_qty: defaultQty, locked: !locked })}
        aria-pressed={locked}
        title={locked ? 'Unlock — let customer change qty' : 'Lock qty for the customer'}
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
          locked
            ? 'border-accent bg-accent text-accent-foreground'
            : 'border-input bg-background text-muted-foreground hover:bg-muted/50',
        )}
      >
        {locked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <LockOpen className="h-3.5 w-3.5" />
        )}
      </button>

      <button
        type="button"
        onClick={onRemove}
        title="Remove from picker"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}

function PickerThumb({ product }: { product: PickerProduct }) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.imageUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-0.5"
      />
    )
  }
  return (
    <div
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground"
    >
      {product.title.slice(0, 2).toUpperCase()}
    </div>
  )
}
