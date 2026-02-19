'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, formatDeliveryDate, todayISODate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DateSelectorCardProps {
  token: string
  initialDate?: string
  drafts: Array<{
    deliveryDate: string
    itemCount: number
  }>
}

type ActionType = 'new' | 'continue'

export function DateSelectorCard({ token, initialDate, drafts }: DateSelectorCardProps) {
  const router = useRouter()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [date, setDate] = useState(initialDate ?? todayISODate())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionType, setActionType] = useState<ActionType>('new')
  const [error, setError] = useState<string | null>(null)

  const draftForDate = drafts.find((draft) => draft.deliveryDate === date)

  const openOrder = async (action: ActionType) => {
    setActionType(action)
    setIsSubmitting(true)
    setError(null)

    const response = await fetch('/api/portal/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Token': token,
      },
      body: JSON.stringify({ deliveryDate: date }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { data?: { order?: { id: string; delivery_date: string } } }
      | { error?: { message?: string } }
      | null

    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload && 'error' in payload ? payload.error?.message ?? 'Request failed' : 'Request failed')
      return
    }

    const orderId = payload && 'data' in payload ? payload.data?.order?.id : null
    const deliveryDate =
      payload && 'data' in payload ? payload.data?.order?.delivery_date ?? date : date

    router.push(orderId ? `/c/${token}/order/link/${orderId}` : `/c/${token}/order/${deliveryDate}`)
    router.refresh()
  }

  const moveDate = (direction: -1 | 1) => {
    const nextDate = addDays(date, direction)
    if (nextDate < todayISODate()) {
      return
    }
    setDate(nextDate)
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Date picker with arrows */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => moveDate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            className="relative min-w-[160px] text-center text-sm font-semibold"
            onClick={() => dateInputRef.current?.showPicker?.()}
          >
            {formatDeliveryDate(date)}
            <input
              ref={dateInputRef}
              type="date"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={date}
              min={todayISODate()}
              onChange={(e) => {
                if (e.target.value && e.target.value >= todayISODate()) {
                  setDate(e.target.value)
                }
              }}
            />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => moveDate(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => openOrder('new')}
            disabled={isSubmitting}
          >
            {isSubmitting && actionType === 'new' ? 'Opening...' : '+ New Order'}
          </Button>

          {draftForDate && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openOrder('continue')}
              disabled={isSubmitting}
            >
              {isSubmitting && actionType === 'continue'
                ? 'Opening...'
                : `Continue (${draftForDate.itemCount} items)`}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
