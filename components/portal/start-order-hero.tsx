'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildCustomerOrderDeepLink, buildCustomerPortalOrderDatePath } from '@/lib/portal-links'
import { addDays, formatDeliveryDate, todayISODate } from '@/lib/utils'

interface StartOrderHeroProps {
  token: string
  initialDate: string
}

export function StartOrderHero({ token, initialDate }: StartOrderHeroProps) {
  const router = useRouter()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [date, setDate] = useState(initialDate)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moveDate = (direction: -1 | 1) => {
    const nextDate = addDays(date, direction)
    if (nextDate < todayISODate()) return
    setDate(nextDate)
  }

  const startOrder = async () => {
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

    const destination = orderId
      ? buildCustomerOrderDeepLink(token, orderId)
      : buildCustomerPortalOrderDatePath(token, deliveryDate)

    if (destination) {
      router.push(destination)
      router.refresh()
    }
  }

  const atToday = date <= todayISODate()

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="inline-flex h-11 items-center rounded-xl border bg-background">
          <button
            type="button"
            onClick={() => moveDate(-1)}
            disabled={atToday}
            aria-label="Previous day"
            className="flex h-full w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.()}
            className="relative h-full px-2 text-sm font-medium"
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
          <button
            type="button"
            onClick={() => moveDate(1)}
            aria-label="Next day"
            className="flex h-full w-8 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Button
          variant="accent"
          size="lg"
          className="h-11"
          onClick={startOrder}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Opening…' : 'Start order'}
          <span aria-hidden className="ml-2">→</span>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
