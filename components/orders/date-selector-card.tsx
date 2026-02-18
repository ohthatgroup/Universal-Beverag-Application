'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatDeliveryDate, todayISODate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface DateSelectorCardProps {
  initialDate?: string
  draftDates: string[]
}

export function DateSelectorCard({ initialDate, draftDates }: DateSelectorCardProps) {
  const router = useRouter()
  const [date, setDate] = useState(initialDate ?? todayISODate())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasDraft = draftDates.includes(date)

  const openOrder = async () => {
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
      | { data?: { order?: { delivery_date: string } } }
      | { error?: { message?: string } }
      | null

    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload && 'error' in payload ? payload.error?.message ?? 'Request failed' : 'Request failed')
      return
    }

    const deliveryDate =
      payload && 'data' in payload && payload.data?.order?.delivery_date
        ? payload.data.order.delivery_date
        : date

    router.push(`/order/${deliveryDate}`)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Delivery Date</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="date"
          value={date}
          min={todayISODate()}
          onChange={(event) => setDate(event.target.value)}
        />

        <div className="text-sm text-muted-foreground">Selected: {formatDeliveryDate(date)}</div>

        <Button className="w-full" onClick={openOrder} disabled={isSubmitting}>
          {isSubmitting ? 'Opening...' : hasDraft ? 'Continue Order' : 'New Order'}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
