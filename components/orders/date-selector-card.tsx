'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, formatDeliveryDate, todayISODate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const [date, setDate] = useState(initialDate ?? todayISODate())
  const [isDialogOpen, setIsDialogOpen] = useState(true)
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

    setIsDialogOpen(false)
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
    <>
      <Button onClick={() => setIsDialogOpen(true)} disabled={isSubmitting} size="lg">
        {isSubmitting ? 'Opening...' : 'Select Delivery Date'}
      </Button>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Date</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => moveDate(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-lg font-semibold">{formatDeliveryDate(date)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => moveDate(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <Button
              className="w-full"
              onClick={() => openOrder('new')}
              disabled={isSubmitting}
            >
              {isSubmitting && actionType === 'new' ? 'Opening...' : '+ New Order'}
            </Button>

            {draftForDate && (
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => openOrder('continue')}
                disabled={isSubmitting}
              >
                {isSubmitting && actionType === 'continue'
                  ? 'Opening...'
                  : `Continue Order (${draftForDate.itemCount} items)`}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
