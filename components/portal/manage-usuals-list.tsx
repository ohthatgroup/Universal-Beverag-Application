'use client'

import { useMemo, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Money } from '@/components/ui/money'
import { cn } from '@/lib/utils'

export interface ManageUsualsProduct {
  id: string
  title: string
  brandName: string | null
  packLabel: string | null
  price: number
  imageUrl: string | null
  isUsual: boolean
}

interface ManageUsualsListProps {
  token: string
  initialProducts: ManageUsualsProduct[]
  showPrices: boolean
}

type FilterTab = 'all' | 'usuals' | 'not-usuals'

export function ManageUsualsList({
  token,
  initialProducts,
  showPrices,
}: ManageUsualsListProps) {
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((p) => {
      if (filter === 'usuals' && !p.isUsual) return false
      if (filter === 'not-usuals' && p.isUsual) return false
      if (term) {
        const haystack = [p.title, p.brandName, p.packLabel]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [products, search, filter])

  const usualsCount = products.filter((p) => p.isUsual).length

  const toggleUsual = async (id: string) => {
    const target = products.find((p) => p.id === id)
    if (!target) return
    const next = !target.isUsual

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isUsual: next } : p)),
    )
    setSavingIds((prev) => new Set(prev).add(id))
    setError(null)

    try {
      const response = await fetch('/api/portal/usuals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-Token': token,
        },
        body: JSON.stringify({ productId: id, isUsual: next }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        throw new Error(payload?.error?.message ?? 'Failed to update usual')
      }
    } catch (saveError) {
      // Roll back on failure.
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isUsual: !next } : p)),
      )
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to update usual',
      )
    } finally {
      setSavingIds((prev) => {
        const copy = new Set(prev)
        copy.delete(id)
        return copy
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, or pack…"
            className="h-10 pl-9"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter products"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
        >
          {([
            { slug: 'all', label: `All (${products.length})` },
            { slug: 'usuals', label: `My usuals (${usualsCount})` },
            { slug: 'not-usuals', label: `Not in usuals (${products.length - usualsCount})` },
          ] as const).map((tab) => {
            const isActive = filter === tab.slug
            return (
              <button
                key={tab.slug}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setFilter(tab.slug)}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-background text-foreground shadow'
                    : 'hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {products.length === 0
            ? 'No products available.'
            : 'No products match your filter.'}
        </p>
      ) : (
        <ul className="divide-y divide-foreground/10 overflow-hidden rounded-xl border bg-card">
          {visible.map((product) => {
            const meta =
              [product.brandName, product.packLabel].filter(Boolean).join(' · ') ||
              null
            const isSaving = savingIds.has(product.id)
            return (
              <li
                key={product.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <ProductThumb product={product} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-semibold">
                    {product.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {meta && <>{meta}</>}
                    {meta && showPrices && ' · '}
                    {showPrices && (
                      <Money value={product.price} className="font-normal" />
                    )}
                    {!meta && !showPrices && '—'}
                  </div>
                </div>
                <Button
                  type="button"
                  variant={product.isUsual ? 'accent' : 'outline'}
                  size="sm"
                  onClick={() => toggleUsual(product.id)}
                  className="shrink-0"
                  aria-pressed={product.isUsual}
                  disabled={isSaving}
                >
                  {product.isUsual ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Usual
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </>
                  )}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ProductThumb({ product }: { product: ManageUsualsProduct }) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.imageUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain"
      />
    )
  }
  return (
    <div
      aria-hidden
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
    >
      {product.title.slice(0, 2).toUpperCase()}
    </div>
  )
}
