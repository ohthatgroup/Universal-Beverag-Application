'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { addDays, formatDeliveryDate, todayISODate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface DateSelectorCardProps {
  initialDate?: string
  drafts: Array<{
    deliveryDate: string
    itemCount: number
  }>
}

type ActionType = 'new' | 'continue'

export function DateSelectorCard({ initialDate, drafts }: DateSelectorCardProps) {
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

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    router.push(orderId ? `/order/link/${orderId}` : `/order/${deliveryDate}`)
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
    <Card>
      <CardHeader>
        <CardTitle>Select Delivery Date</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">Selected: {formatDeliveryDate(date)}</div>

        <Button className="w-full" onClick={() => setIsDialogOpen(true)} disabled={isSubmitting}>
          {isSubmitting ? 'Opening...' : 'Select Date'}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Date</DialogTitle>
            <DialogDescription>Choose a delivery date to create or continue an order.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => moveDate(-1)}>
                Prev
              </Button>
              <div className="text-sm font-medium">{formatDeliveryDate(date)}</div>
              <Button type="button" variant="outline" size="sm" onClick={() => moveDate(1)}>
                Next
              </Button>
            </div>

            <Input
              type="date"
              value={date}
              min={todayISODate()}
              onChange={(event) => setDate(event.target.value)}
            />

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
    </Card>
  )
}
