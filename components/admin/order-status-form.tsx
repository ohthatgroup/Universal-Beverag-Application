'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { OrderStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
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

  const save = async () => {
    setIsSaving(true)
    setError(null)

    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
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
    <div className="space-y-2 rounded-md border p-3">
      <div className="text-sm font-medium">Order Status</div>
      <Select value={status} onValueChange={(value: OrderStatus) => setStatus(value)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="submitted">Submitted</SelectItem>
          <SelectItem value="delivered">Delivered</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={save} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save status'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
