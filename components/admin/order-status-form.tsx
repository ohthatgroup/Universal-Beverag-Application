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
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog'

interface OrderStatusFormProps {
  orderId: string
  initialStatus: OrderStatus
}

const STATUS_RANK: Record<OrderStatus, number> = {
  draft: 0,
  submitted: 1,
  delivered: 2,
}

const DOWNGRADE_COPY: Record<string, { title: string; description: string; confirmLabel: string }> = {
  'submitted->draft': {
    title: 'Move this order back to draft?',
    description: 'The customer will lose visibility until it is submitted again.',
    confirmLabel: 'Move to draft',
  },
  'delivered->submitted': {
    title: 'Move delivered order back to submitted?',
    description: 'This will clear the delivered timestamp. You can re-mark it delivered later.',
    confirmLabel: 'Move to submitted',
  },
  'delivered->draft': {
    title: 'Move this order back to draft?',
    description: 'The customer will lose visibility and the delivered timestamp will be cleared.',
    confirmLabel: 'Move to draft',
  },
}

export function OrderStatusForm({ orderId, initialStatus }: OrderStatusFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState<OrderStatus>(initialStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDowngrade, setPendingDowngrade] = useState<OrderStatus | null>(null)

  const applyChange = async (nextStatus: OrderStatus) => {
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
      setStatus(initialStatus)
      return
    }

    router.refresh()
  }

  const onChange = (nextStatus: OrderStatus) => {
    if (STATUS_RANK[nextStatus] < STATUS_RANK[status]) {
      setPendingDowngrade(nextStatus)
      return
    }
    void applyChange(nextStatus)
  }

  const downgradeKey = pendingDowngrade ? `${status}->${pendingDowngrade}` : null
  const copy = downgradeKey ? DOWNGRADE_COPY[downgradeKey] : null

  return (
    <div className="flex flex-wrap items-center gap-2">
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

      {copy && pendingDowngrade && (
        <DestructiveConfirmDialog
          open={pendingDowngrade !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDowngrade(null)
          }}
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirmLabel}
          pending={isSaving}
          onConfirm={async () => {
            const target = pendingDowngrade
            setPendingDowngrade(null)
            await applyChange(target)
          }}
        />
      )}
    </div>
  )
}
