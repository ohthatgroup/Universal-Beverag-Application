'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { Panel } from '@/components/ui/panel'
import { formatDeliveryDate, getProductPackLabel } from '@/lib/utils'

export interface OrderPreviewSummary {
  id: string
  deliveryDate: string
  itemCount: number
  total: number
  status: 'submitted' | 'delivered'
}

interface OrderPreviewSheetProps {
  token: string
  /** When non-null, sheet is open and fetches items for this order. */
  order: OrderPreviewSummary | null
  showPrices: boolean
  onClose: () => void
  /** Called with the source order id when the customer taps Reorder. */
  onReorder: (sourceOrderId: string) => void
}

interface PreviewItemRow {
  id: string
  product_id: string | null
  quantity: number
  unit_price: number
  line_total: number | null
  product_title: string | null
  product_image_url: string | null
  product_pack_details: string | null
  product_pack_count: number | null
  product_size_value: number | null
  product_size_uom: string | null
}

/**
 * Read-only drawer over a past order. Fetches items lazily on open via
 * GET /api/portal/orders/[id]/items, renders product image + title + pack +
 * qty + line total, and exposes a Reorder CTA that calls back to the
 * parent (which performs the clone-and-go).
 */
export function OrderPreviewSheet({
  token,
  order,
  showPrices,
  onClose,
  onReorder,
}: OrderPreviewSheetProps) {
  const open = order !== null
  const [items, setItems] = useState<PreviewItemRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!order) {
      setItems(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/portal/orders/${order.id}/items`, {
      headers: { 'X-Customer-Token': token },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { data?: { items?: PreviewItemRow[] } }
          | { error?: { message?: string } }
          | null
        if (!response.ok) {
          const message =
            payload && 'error' in payload
              ? payload.error?.message ?? 'Failed to load items'
              : 'Failed to load items'
          throw new Error(message)
        }
        if (cancelled) return
        const list =
          payload && 'data' in payload ? payload.data?.items ?? [] : []
        setItems(list)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load items')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [order, token])

  return (
    <Panel
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      variant="bottom-sheet"
      width="content"
      srTitle={
        order ? `Order from ${formatDeliveryDate(order.deliveryDate)}` : 'Order preview'
      }
    >
      <Panel.Header>
        <div className="flex flex-1 flex-col">
          <h2 className="text-base font-semibold">
            {order ? formatDeliveryDate(order.deliveryDate) : ''}
          </h2>
          {order && (
            <p className="text-xs capitalize text-muted-foreground">
              {order.status} · {order.itemCount}{' '}
              {order.itemCount === 1 ? 'item' : 'items'}
              {showPrices && (
                <>
                  {' · '}
                  <Money value={order.total} className="font-normal" />
                </>
              )}
            </p>
          )}
        </div>
      </Panel.Header>

      <Panel.Body className="px-4 py-3">
        {loading && (
          <p className="text-sm text-muted-foreground">Loading items…</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && items && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No items in this order.</p>
        )}
        {!loading && !error && items && items.length > 0 && (
          <ul className="divide-y divide-foreground/10">
            {items.map((item) => (
              <PreviewItemRow
                key={item.id}
                item={item}
                showPrices={showPrices}
              />
            ))}
          </ul>
        )}
      </Panel.Body>

      <Panel.Footer>
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          onClick={() => {
            if (order) onReorder(order.id)
          }}
          disabled={!order}
        >
          <RotateCcw className="h-4 w-4" />
          Reorder these items
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Panel.Footer>
    </Panel>
  )
}

function PreviewItemRow({
  item,
  showPrices,
}: {
  item: PreviewItemRow
  showPrices: boolean
}) {
  const title = item.product_title ?? 'Removed product'
  const imageUrl = item.product_image_url ?? null
  const packLabel = item.product_id
    ? getProductPackLabel({
        pack_details: item.product_pack_details,
        pack_count: item.product_pack_count,
        size_value: item.product_size_value,
        size_uom: item.product_size_uom,
      })
    : null
  const lineTotal = item.line_total ?? item.unit_price * item.quantity

  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <PreviewThumb title={title} imageUrl={imageUrl} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-medium">{title}</p>
        {packLabel && (
          <p className="text-xs text-muted-foreground">{packLabel}</p>
        )}
      </div>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        × {item.quantity}
      </span>
      {showPrices && (
        <Money
          value={lineTotal}
          className="w-20 shrink-0 text-right font-normal"
        />
      )}
    </li>
  )
}

function PreviewThumb({
  title,
  imageUrl,
}: {
  title: string
  imageUrl: string | null
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain"
      />
    )
  }
  return (
    <div
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-semibold text-muted-foreground"
    >
      {title.slice(0, 2).toUpperCase()}
    </div>
  )
}
