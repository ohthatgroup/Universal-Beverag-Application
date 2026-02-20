'use client'

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'

type DialogMode = 'order' | 'customer'

export interface PickerProduct {
  id: string
  title: string
  brandLabel: string
  packLabel: string
  price: number
}

interface ProductPickerDialogProps {
  mode: DialogMode
  endpoint: string
  title: string
  triggerLabel: string
  products: PickerProduct[]
}

export function ProductPickerDialog({
  mode,
  endpoint,
  title,
  triggerLabel,
  products,
}: ProductPickerDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('all')
  const [isAddingId, setIsAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const brands = useMemo(() => {
    const unique = new Set<string>()
    for (const product of products) {
      if (product.brandLabel) unique.add(product.brandLabel)
    }
    return Array.from(unique).sort((left, right) => left.localeCompare(right))
  }, [products])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return products.filter((product) => {
      if (brand !== 'all' && product.brandLabel !== brand) return false
      if (!normalized) return true
      const haystack = [product.title, product.brandLabel, product.packLabel].join(' ').toLowerCase()
      return haystack.includes(normalized)
    })
  }, [products, brand, query])

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

    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                className="pl-9"
              />
            </div>
            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-48"
            >
              <option value="all">All brands</option>
              {brands.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="min-h-0 max-h-[58vh] space-y-0 overflow-y-auto rounded-md border sm:max-h-[420px]">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No products found.</p>
            ) : (
              filtered.map((product) => (
                <div key={product.id} className="flex flex-col gap-2 border-b px-3 py-2.5 last:border-0 sm:flex-row sm:items-center sm:gap-3">
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
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
