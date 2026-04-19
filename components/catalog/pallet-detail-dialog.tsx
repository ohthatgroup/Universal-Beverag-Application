'use client'

import Image from 'next/image'
import { Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import type { PalletDeal } from '@/lib/types'

// TODO(engineer): extend PalletDeal loader with `items: PalletDealItem[]`
// (product_title, brand_name, pack_label, image_url, quantity). See
// docs/st-9-engineer-followups.md §"Data needs for the new pallet detail popup".
export interface PalletDetailItem {
  product_id: string
  product_title: string
  brand_name: string | null
  pack_label: string | null
  image_url: string | null
  quantity: number
}

interface PalletDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: PalletDeal | null
  items?: PalletDetailItem[]
  showPrices: boolean
}

export function PalletDetailDialog({
  open,
  onOpenChange,
  deal,
  items,
  showPrices,
}: PalletDetailDialogProps) {
  if (!deal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        {deal.image_url ? (
          <div className="relative h-40 w-full overflow-hidden rounded-t-xl bg-muted">
            <Image
              src={deal.image_url}
              alt={deal.title}
              fill
              sizes="(max-width: 480px) 100vw, 28rem"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-t-xl bg-muted">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-4 px-6 pb-6 pt-2">
          <DialogHeader>
            <DialogTitle>{deal.title}</DialogTitle>
            <DialogDescription>
              {deal.savings_text}
              {showPrices && <> · {formatCurrency(deal.price)}</>}
            </DialogDescription>
          </DialogHeader>

          {deal.description && (
            <p className="text-sm text-muted-foreground">{deal.description}</p>
          )}

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Included in this pallet
            </div>
            {items && items.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {items.map((item) => (
                  <li
                    key={item.product_id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.product_title}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {item.product_title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[item.brand_name, item.pack_label]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-medium tabular-nums">
                      ×{item.quantity}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                Item breakdown not yet available.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
