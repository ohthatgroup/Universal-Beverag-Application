'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { CatalogProduct } from '@/lib/types'
import {
  cn,
  formatCurrency,
  getProductSizeLabel,
} from '@/lib/utils'

interface ProductPopoutProps {
  product: CatalogProduct | null
  quantity: number
  onChange: (next: number) => void
  onOpenChange: (open: boolean) => void
  showPrices: boolean
}

export function ProductPopout({
  product,
  quantity,
  onChange,
  onOpenChange,
  showPrices,
}: ProductPopoutProps) {
  const open = product !== null
  const [draft, setDraft] = useState<string>(String(quantity))
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setDraft(String(quantity))
  }, [quantity, product?.id])

  if (!product) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent className="hidden" />
      </Dialog>
    )
  }

  const brandName = product.brand?.name ?? 'Brand'
  const sizeLabel = getProductSizeLabel(product) ?? ''
  const thumbSrc = product.image_url ?? product.brand?.logo_url ?? null

  const commitDraft = () => {
    const parsed = Number.parseInt(draft, 10)
    const next = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
    setDraft(String(next))
    if (next !== quantity) onChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {brandName}
          </span>
          {sizeLabel && (
            <span className="mr-8 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {sizeLabel}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-center">
          <div className="flex aspect-square w-40 items-center justify-center overflow-hidden rounded-md border bg-background p-2">
            {thumbSrc ? (
              <Image
                src={thumbSrc}
                alt=""
                width={240}
                height={240}
                className="h-full w-full object-contain"
                unoptimized
              />
            ) : (
              <span className="text-3xl font-semibold text-muted-foreground" aria-hidden="true">
                {(product.title ?? '·').trim().charAt(0).toUpperCase() || '·'}
              </span>
            )}
          </div>
        </div>

        <div className="text-center">
          <DialogTitle className="text-base">{product.title}</DialogTitle>
          {showPrices && (
            <div className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(product.effective_price)} / each
            </div>
          )}
        </div>

        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Decrease quantity"
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-md border bg-background',
              'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40',
            )}
            onClick={() => {
              const next = Math.max(0, quantity - 1)
              setDraft(String(next))
              if (next !== quantity) onChange(next)
            }}
            disabled={quantity <= 0}
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^0-9]/g, '')
              setDraft(cleaned)
            }}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitDraft()
                inputRef.current?.blur()
              }
            }}
            aria-label="Quantity"
            className={cn(
              'h-11 w-16 rounded-md border bg-background text-center text-lg font-semibold',
              'focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          />
          <button
            type="button"
            aria-label="Increase quantity"
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-md border bg-background',
              'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring',
            )}
            onClick={() => {
              const next = quantity + 1
              setDraft(String(next))
              onChange(next)
            }}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex justify-center">
          <DialogClose asChild>
            <Button type="button" size="sm">
              Done
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
