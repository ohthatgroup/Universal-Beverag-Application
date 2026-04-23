'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  MoreVertical,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrderStatusForm } from '@/components/admin/order-status-form'
import { ShareWithCustomerMenu } from '@/components/admin/share-with-customer-menu'
import { ShareSubmittedOrderMenu } from '@/components/admin/share-submitted-order-menu'
import { QuantitySelector } from '@/components/catalog/quantity-selector'
import type { OrderStatus } from '@/lib/types'
import { formatCurrency, formatDeliveryDate } from '@/lib/utils'

// Admin order editor — r5 pass.
// - No Present mode (deleted).
// - No desktop drag (never had it here; catalog handles its own reorder).
// - Back uses router.back() with a safe fallback to `backHref`.
// - Status moved out of the primary bar, into a small meta row.
// - Share surface is status-switched: draft = copy-only button, submitted/delivered = rich menu.
// - Add Product lives on the right of the Items (N) section header.

export interface AdminOrderEditorItem {
  id: string
  productId: string | null
  palletDealId: string | null
  label: string
  pack: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  href: string | null
}

export interface AdminOrderEditorProps {
  orderId: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  customerHref: string | null
  deliveryDate: string
  status: OrderStatus
  itemCount: number
  total: number
  items: AdminOrderEditorItem[]
  backHref: string
  backLabel: string
  shareLink: string | null
  csvHref: string
  salesmanOfficeEmail: string | null
  onCancelAction: React.ReactNode
  onDeleteAction: React.ReactNode
  addProductSlot?: React.ReactNode
  markDeliveredSlot?: React.ReactNode
}

export function AdminOrderEditor({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  customerHref,
  deliveryDate,
  status,
  itemCount,
  total,
  items,
  backHref,
  backLabel,
  shareLink,
  csvHref,
  salesmanOfficeEmail,
  onCancelAction,
  onDeleteAction,
  addProductSlot,
  markDeliveredSlot,
}: AdminOrderEditorProps) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(backHref)
    }
  }

  return (
    <div className="space-y-5">
      {/* Collapsed header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel || 'Back'}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <div>{onCancelAction}</div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
                <div>{onDeleteAction}</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{customerName}</h1>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {formatDeliveryDate(deliveryDate)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <OrderStatusForm orderId={orderId} initialStatus={status} />
          {markDeliveredSlot}
          {shareLink && status === 'draft' ? (
            <ShareWithCustomerMenu url={shareLink} label="Copy draft link" />
          ) : null}
          {shareLink && (status === 'submitted' || status === 'delivered') ? (
            <ShareSubmittedOrderMenu
              orderId={orderId}
              customerName={customerName}
              customerEmail={customerEmail}
              deliveryDate={deliveryDate}
              shareLink={shareLink}
              csvHref={csvHref}
              markdownHref={`/api/orders/${orderId}/markdown`}
              salesmanOfficeEmail={salesmanOfficeEmail}
            />
          ) : null}
        </div>

        {(customerEmail || customerPhone || customerHref) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {customerEmail && (
              <a href={`mailto:${customerEmail}`} className="hover:text-foreground">
                {customerEmail}
              </a>
            )}
            {customerEmail && (customerPhone || customerHref) && <span aria-hidden>·</span>}
            {customerPhone && (
              <a href={`tel:${customerPhone}`} className="hover:text-foreground">
                {customerPhone}
              </a>
            )}
            {customerPhone && customerHref && <span aria-hidden>·</span>}
            {customerHref && (
              <Link href={customerHref} className="hover:text-foreground hover:underline">
                View customer
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Items — "+ Add" anchored right of the section title */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Items ({itemCount})</h2>
          {addProductSlot ? (
            <div className="shrink-0">{addProductSlot}</div>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items.</p>
        ) : (
          <div className="divide-y rounded-md border bg-card">
            {items.map((item) => (
              <AdminOrderLine key={item.id} item={item} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3 font-semibold">
          <span>{itemCount} items</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </section>
    </div>
  )
}

function AdminOrderLine({ item }: { item: AdminOrderEditorItem }) {
  // Design-only: unit-price override + delete-line remain stub handlers.
  const [unitPrice, setUnitPrice] = useState<number>(item.unitPrice)
  const [quantity, setQuantity] = useState(item.quantity)
  const [editingPrice, setEditingPrice] = useState(false)
  const [draftPrice, setDraftPrice] = useState<string>(item.unitPrice.toFixed(2))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingPrice) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editingPrice])

  const TitleEl = item.href ? Link : 'div'
  const titleProps = item.href ? { href: item.href } : {}

  const commitPrice = () => {
    const parsed = Number.parseFloat(draftPrice)
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setUnitPrice(parsed)
    } else {
      setDraftPrice(unitPrice.toFixed(2))
    }
    setEditingPrice(false)
  }

  const cancelPrice = () => {
    setDraftPrice(unitPrice.toFixed(2))
    setEditingPrice(false)
  }

  const priceEditor = (
    <>
      {editingPrice ? (
        <Input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0"
          value={draftPrice}
          onChange={(e) => setDraftPrice(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitPrice()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              cancelPrice()
            }
          }}
          className="h-7 w-20 text-right text-sm tabular-nums"
          aria-label="Unit price"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingPrice(true)}
          className="text-right underline decoration-dotted underline-offset-2 hover:text-foreground"
          aria-label="Edit unit price"
        >
          {formatCurrency(unitPrice)}
        </button>
      )}
    </>
  )

  const lineTotal = unitPrice * quantity

  return (
    <>
      {/* Desktop: horizontal row — quantity picker leftmost */}
      <div className="hidden items-center gap-3 px-3 py-3 md:flex">
        <div className="shrink-0">
          <QuantitySelector quantity={quantity} onChange={setQuantity} />
        </div>

        <div className="min-w-0 flex-1">
          <TitleEl
            {...(titleProps as { href: string })}
            className="block text-sm font-medium hover:underline"
          >
            {item.label}
          </TitleEl>
          {item.pack && <div className="text-xs text-muted-foreground">{item.pack}</div>}
        </div>

        <div className="w-20 shrink-0 text-right text-sm tabular-nums">{priceEditor}</div>
      </div>

      {/* Mobile: stacked card — quantity picker leftmost in action row */}
      <div className="flex flex-col gap-2 px-3 py-3 md:hidden">
        <TitleEl
          {...(titleProps as { href: string })}
          className="block text-sm font-medium hover:underline"
        >
          {item.label}
        </TitleEl>
        {item.pack && <div className="text-xs text-muted-foreground">{item.pack}</div>}
        <div className="flex items-center justify-between gap-3">
          <QuantitySelector quantity={quantity} onChange={setQuantity} />
          <div className="text-sm tabular-nums">{priceEditor}</div>
        </div>
        <div className="text-right text-sm font-medium tabular-nums">
          {formatCurrency(lineTotal)}
        </div>
      </div>
    </>
  )
}

// Re-export used by addProductSlot wrapper if any caller still imports the icon.
export { Plus }
