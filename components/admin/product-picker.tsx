'use client'

import { useMemo, useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
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

interface BaseProps {
  products: PickerProduct[]
  /** Max rows to render at a time (search filters to this). Default 50. */
  visibleLimit?: number
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
  const { products, visibleLimit = 50 } = props
  const [query, setQuery] = useState('')

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

  return (
    <div className="space-y-2">
      {props.mode === 'multi' && selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/30 px-2 py-2">
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
