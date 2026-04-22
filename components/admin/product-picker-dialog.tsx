'use client'

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  FilterReveal,
  FilterTrigger,
  useFilterPanelState,
} from '@/components/catalog/filter-panel'
import type { Brand } from '@/lib/types'
import { cn, formatCurrency } from '@/lib/utils'

type DialogMode = 'order' | 'customer'

export interface PickerProduct {
  id: string
  title: string
  brandLabel: string
  packLabel: string
  sizeLabel?: string
  price: number
}

interface ProductPickerDialogProps {
  mode: DialogMode
  endpoint: string
  title: string
  triggerLabel: string
  products: PickerProduct[]
  previouslyOrderedIds?: string[]
  triggerVariant?: 'default' | 'outline' | 'ghost'
  triggerSize?: 'sm' | 'default'
  defaultGroupBy?: 'brand' | 'size'
}

export function ProductPickerDialog({
  mode,
  endpoint,
  title,
  triggerLabel,
  products,
  previouslyOrderedIds = [],
  triggerVariant = 'default',
  triggerSize = 'sm',
  defaultGroupBy = 'brand',
}: ProductPickerDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [brandLabels, setBrandLabels] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])
  const [showPrevious, setShowPrevious] = useState(false)
  const [groupBy, setGroupBy] = useState<'brand' | 'size'>(defaultGroupBy)
  const [isAddingId, setIsAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previouslyOrderedSet = useMemo(
    () => new Set(previouslyOrderedIds),
    [previouslyOrderedIds]
  )

  const availableBrands = useMemo<Brand[]>(() => {
    const unique = new Set<string>()
    for (const product of products) {
      if (product.brandLabel) unique.add(product.brandLabel)
    }
    return Array.from(unique)
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({ id: name, name } as Brand))
  }, [products])

  const availableSizes = useMemo(() => {
    const unique = new Set<string>()
    for (const product of products) {
      const label = product.sizeLabel ?? product.packLabel
      if (label) unique.add(label)
    }
    return Array.from(unique).sort((left, right) => left.localeCompare(right))
  }, [products])

  const filterPanelState = useFilterPanelState(sizes, brandLabels)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const brandSet = new Set(brandLabels)
    const sizeSet = new Set(sizes)
    return products.filter((product) => {
      if (brandSet.size > 0 && !brandSet.has(product.brandLabel)) return false
      const sizeLabel = product.sizeLabel ?? product.packLabel
      if (sizeSet.size > 0 && !(sizeLabel && sizeSet.has(sizeLabel))) return false
      if (showPrevious && !previouslyOrderedSet.has(product.id)) return false
      if (!normalized) return true
      const haystack = [product.title, product.brandLabel, product.packLabel]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [products, brandLabels, sizes, showPrevious, previouslyOrderedSet, query])

  const isNarrowed = brandLabels.length > 0 || sizes.length > 0 || query.trim().length > 0
  const renderFlat = isNarrowed

  const grouped = useMemo(() => {
    const map = new Map<string, PickerProduct[]>()
    for (const product of filtered) {
      const key = groupBy === 'brand'
        ? (product.brandLabel || 'Other')
        : (product.sizeLabel ?? product.packLabel ?? 'Other')
      const existing = map.get(key) ?? []
      existing.push(product)
      map.set(key, existing)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ label, items }))
  }, [filtered, groupBy])

  const addProduct = async (product: PickerProduct) => {
    setIsAddingId(product.id)
    setError(null)

    const body =
      mode === 'order'
        ? { productId: product.id, quantity: 1, unitPrice: product.price }
        : { productId: product.id, hidden: false }

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setIsAddingId(null)

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(payload?.error?.message ?? 'Unable to add product')
      return
    }

    // Keep the dialog open so the salesman can add more items inline.
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={triggerSize} variant={triggerVariant}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-[42rem] overflow-hidden p-3 sm:max-h-[92vh] sm:w-[calc(100vw-1.5rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Search and filter products, then add items without leaving this page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                className="pl-9"
              />
            </div>
            <FilterTrigger state={filterPanelState} />
          </div>

          <FilterReveal
            state={filterPanelState}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            sizes={availableSizes}
            selectedSizes={sizes}
            onSizeToggle={(s) =>
              setSizes((prev) =>
                prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
              )
            }
            onSizeClear={() => setSizes([])}
            brands={availableBrands}
            selectedBrandIds={brandLabels}
            onBrandToggle={(id) =>
              setBrandLabels((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            onBrandClear={() => setBrandLabels([])}
          />

          {previouslyOrderedIds.length > 0 && (
            <label className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={showPrevious}
                onChange={(event) => setShowPrevious(event.target.checked)}
              />
              <span>Show previously ordered only</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {previouslyOrderedIds.length}
              </span>
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className={cn(
            'min-h-0 max-h-[58vh] overflow-y-auto rounded-md border sm:max-h-[420px]',
            renderFlat ? 'space-y-0' : 'p-0'
          )}>
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No products found.</p>
            ) : renderFlat ? (
              filtered.map((product) => renderPickerRow(product, isAddingId, addProduct))
            ) : (
              <div className="divide-y">
                {grouped.map((section) => (
                  <section key={section.label}>
                    <div className="sticky top-0 z-10 bg-background/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                      {groupBy === 'brand' ? 'Brand' : 'Size'}: {section.label}
                    </div>
                    <div className="divide-y">
                      {section.items.map((product) => renderPickerRow(product, isAddingId, addProduct))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function renderPickerRow(
  product: PickerProduct,
  isAddingId: string | null,
  addProduct: (product: PickerProduct) => void,
) {
  return (
    <div key={product.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{product.title}</div>
        <div className="text-xs text-muted-foreground">
          {product.brandLabel} - {product.packLabel}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-3">
        <div className="text-sm text-muted-foreground">{formatCurrency(product.price)}</div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={isAddingId === product.id}
          onClick={() => addProduct(product)}
        >
          {isAddingId === product.id ? 'Adding...' : 'Add'}
        </Button>
      </div>
    </div>
  )
}
