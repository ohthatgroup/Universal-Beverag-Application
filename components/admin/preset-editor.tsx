'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { BrandLogoSlot } from '@/components/admin/brand-logo-slot'
import { PresetVisibilityRow } from '@/components/admin/preset-visibility-row'
import { Button } from '@/components/ui/button'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { presetsClient } from '@/lib/admin/presets-client'
import { cn } from '@/lib/utils'

export interface PresetBrand {
  id: string
  name: string
  logoUrl: string | null
  hidden: boolean
  pinned: boolean
}

export interface PresetSize {
  key: string
  label: string
  hidden: boolean
}

export interface PresetProductOverride {
  id: string
  title: string
  brandName: string
  sizeLabel: string
  hidden: boolean
  pinned: boolean
}

export interface PresetEditorData {
  id: string
  name: string
  description: string | null
  brands: PresetBrand[]
  sizes: PresetSize[]
  productOverrides: PresetProductOverride[]
}

interface PresetEditorProps {
  preset: PresetEditorData
  availableCustomers?: { id: string; name: string }[]
}

export function PresetEditor({ preset }: PresetEditorProps) {
  const router = useRouter()
  const [name, setName] = useState(preset.name)
  const [editingName, setEditingName] = useState(false)
  const [brands, setBrands] = useState(preset.brands)
  const [sizes, setSizes] = useState(preset.sizes)
  const [products, setProducts] = useState(preset.productOverrides)
  const [brandQuery, setBrandQuery] = useState('')
  const [sizeQuery, setSizeQuery] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const persistName = async (nextName: string) => {
    if (nextName === preset.name) return
    await presetsClient.update(preset.id, { name: nextName }).catch(() => {})
  }

  const persistBrands = async (next: PresetBrand[]) => {
    await presetsClient
      .update(preset.id, {
        brandRules: next
          .filter((b) => b.hidden || b.pinned)
          .map((b) => ({ brandId: b.id, isHidden: b.hidden, isPinned: b.pinned })),
      })
      .catch(() => {})
  }

  const persistSizes = async (next: PresetSize[]) => {
    await presetsClient
      .update(preset.id, {
        sizeRules: next
          .filter((s) => s.hidden)
          .map((s) => ({ sizeKey: s.key, isHidden: s.hidden })),
      })
      .catch(() => {})
  }

  const persistProducts = async (next: PresetProductOverride[]) => {
    await presetsClient
      .update(preset.id, {
        productRules: next.map((p) => ({
          productId: p.id,
          isHidden: p.hidden,
          isPinned: p.pinned,
        })),
      })
      .catch(() => {})
  }

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await presetsClient.remove(preset.id)
      router.push('/admin/presets')
      router.refresh()
    } finally {
      setDeleting(false)
      setConfirmDeleteOpen(false)
    }
  }

  const brandCounts = useMemo(
    () => brands.filter((b) => b.hidden || b.pinned).length,
    [brands]
  )
  const sizeCounts = useMemo(() => sizes.filter((s) => s.hidden).length, [sizes])
  const productCounts = products.length

  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase()
    if (!q) return brands
    return brands.filter((b) => b.name.toLowerCase().includes(q))
  }, [brands, brandQuery])

  const filteredSizes = useMemo(() => {
    const q = sizeQuery.trim().toLowerCase()
    if (!q) return sizes
    return sizes.filter((s) => s.label.toLowerCase().includes(q))
  }, [sizes, sizeQuery])

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.brandName.toLowerCase().includes(q) ||
        p.sizeLabel.toLowerCase().includes(q)
    )
  }, [products, productQuery])

  const updateBrand = (id: string, patch: Partial<PresetBrand>) => {
    setBrands((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
      void persistBrands(next)
      return next
    })
  }

  const updateSize = (key: string, patch: Partial<PresetSize>) => {
    setSizes((prev) => {
      const next = prev.map((s) => (s.key === key ? { ...s, ...patch } : s))
      void persistSizes(next)
      return next
    })
  }

  const updateProduct = (id: string, patch: Partial<PresetProductOverride>) => {
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      void persistProducts(next)
      return next
    })
  }

  const removeProduct = (id: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id)
      void persistProducts(next)
      return next
    })
  }

  return (
    <div className="space-y-5">
      {/* Inline-editable title row */}
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Name
        </h2>
        <div className="rounded-lg border bg-card px-3 py-2">
          {editingName ? (
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => {
                setEditingName(false)
                const trimmed = name.trim()
                if (trimmed.length > 0 && trimmed !== preset.name) {
                  void persistName(trimmed)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  ;(event.target as HTMLInputElement).blur()
                } else if (event.key === 'Escape') {
                  setName(preset.name)
                  setEditingName(false)
                }
              }}
              className="h-9"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="w-full text-left text-base font-semibold decoration-dotted underline-offset-4 hover:underline"
            >
              {name}
            </button>
          )}
          {preset.description ? (
            <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
          ) : null}
        </div>
      </section>

      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1 sm:w-auto">
          <TabsTrigger value="brands" className="gap-1.5">
            Brands
            <span className="rounded bg-background/60 px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground data-[state=active]:bg-muted">
              {brandCounts}/{brands.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="sizes" className="gap-1.5">
            Sizes
            <span className="rounded bg-background/60 px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {sizeCounts}/{sizes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5">
            Products
            <span className="rounded bg-background/60 px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {productCounts}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="space-y-3">
          <Input
            placeholder="Search brands..."
            value={brandQuery}
            onChange={(event) => setBrandQuery(event.target.value)}
            className="h-9"
          />
          {filteredBrands.length === 0 ? (
            <EmptyMessage text="No brands match your search." />
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {filteredBrands.map((brand) => (
                <PresetVisibilityRow
                  key={brand.id}
                  label={brand.name}
                  leading={
                    <BrandLogoSlot
                      name={brand.name}
                      logoUrl={brand.logoUrl}
                      editable={false}
                    />
                  }
                  pinned={brand.pinned}
                  hidden={brand.hidden}
                  onTogglePin={(next) => updateBrand(brand.id, { pinned: next })}
                  onToggleHide={(next) => updateBrand(brand.id, { hidden: next })}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="sizes" className="space-y-3">
          <Input
            placeholder="Search sizes..."
            value={sizeQuery}
            onChange={(event) => setSizeQuery(event.target.value)}
            className="h-9"
          />
          {filteredSizes.length === 0 ? (
            <EmptyMessage text="No sizes match your search." />
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {filteredSizes.map((size) => (
                <PresetVisibilityRow
                  key={size.key}
                  label={size.label}
                  showPin={false}
                  hidden={size.hidden}
                  onToggleHide={(next) => updateSize(size.key, { hidden: next })}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Product overrides win over brand and size rules.
            </p>
            <Button type="button" variant="outline" size="sm">
              <Plus className="h-3.5 w-3.5" /> Add product
            </Button>
          </div>
          <Input
            placeholder="Search product overrides..."
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            className="h-9"
          />
          {filteredProducts.length === 0 ? (
            <EmptyMessage
              text={
                products.length === 0
                  ? 'No product-level overrides. Add one to override brand or size visibility for a specific product.'
                  : 'No products match your search.'
              }
            />
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {filteredProducts.map((product) => (
                <PresetVisibilityRow
                  key={product.id}
                  label={product.title}
                  sub={`${product.brandName} · ${product.sizeLabel}`}
                  pinned={product.pinned}
                  hidden={product.hidden}
                  onTogglePin={(next) => updateProduct(product.id, { pinned: next })}
                  onToggleHide={(next) => updateProduct(product.id, { hidden: next })}
                  trailing={
                    <button
                      type="button"
                      aria-label={`Remove ${product.title} override`}
                      onClick={() => removeProduct(product.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  }
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer summary + destructive action */}
      <section className="rounded-lg border bg-card p-3 text-sm">
        <div className="text-muted-foreground">
          Hides {brands.filter((b) => b.hidden).length} brands · {sizeCounts} sizes ·{' '}
          {productCounts} product override{productCounts === 1 ? '' : 's'}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDeleteOpen(true)}
            className={cn('text-destructive hover:text-destructive')}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" /> Delete preset
          </Button>
        </div>
      </section>

      <ConfirmSheet
        open={confirmDeleteOpen}
        onOpenChange={(next) => {
          if (!deleting) setConfirmDeleteOpen(next)
        }}
        title={`Delete "${name}"?`}
        description="This can't be undone. Customers who had this preset applied keep their current visibility rules."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={deleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
