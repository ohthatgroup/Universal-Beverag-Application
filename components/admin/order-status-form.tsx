'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { OrderStatus } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OrderStatusFormProps {
  orderId: string
  initialStatus: OrderStatus
}

export function OrderStatusForm({ orderId, initialStatus }: OrderStatusFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState<OrderStatus>(initialStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onChange = async (nextStatus: OrderStatus) => {
    setStatus(nextStatus)
    setIsSaving(true)
    setError(null)

    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: nextStatus }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null

    setIsSaving(false)

    if (!response.ok) {
      setError(payload?.error?.message ?? 'Failed to update status')
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</span>
      <Select value={status} onValueChange={(value) => onChange(value as OrderStatus)}>
        <SelectTrigger className="h-8 w-[148px]" disabled={isSaving}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="submitted">Submitted</SelectItem>
          <SelectItem value="delivered">Delivered</SelectItem>
        </SelectContent>
      </Select>
      {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
