'use client'

import { useCallback, useRef } from 'react'
import { debounce } from '@/lib/utils'

interface UseAutoSavePortalOptions {
  orderId: string
  token: string
  onError?: (error: Error) => void
  onSuccess?: () => void
  debounceMs?: number
}

export function useAutoSavePortal({
  orderId,
  token,
  onError,
  onSuccess,
  debounceMs = 300,
}: UseAutoSavePortalOptions) {
  const saveRef = useRef(
    debounce(
      async ({
        productId,
        palletDealId,
        quantity,
        unitPrice,
      }: {
        productId?: string | null
        palletDealId?: string | null
        quantity: number
        unitPrice: number
      }) => {
        if (!productId && !palletDealId) {
          onError?.(new Error('Autosave requires either productId or palletDealId'))
          return
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Customer-Token': token,
        }

        if (quantity === 0) {
          // Delete the row when quantity reaches zero
          const response = await fetch(`/api/portal/orders/${orderId}/items`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ productId, palletDealId }),
          })

          if (!response.ok) {
            const payload = await response.json().catch(() => null)
            onError?.(new Error(payload?.error?.message ?? 'Failed to delete item'))
          } else {
            onSuccess?.()
          }
        } else {
          // Upsert the item
          const response = await fetch(`/api/portal/orders/${orderId}/items`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ productId, palletDealId, quantity, unitPrice }),
          })

          if (!response.ok) {
            const payload = await response.json().catch(() => null)
            onError?.(new Error(payload?.error?.message ?? 'Failed to save item'))
          } else {
            onSuccess?.()
          }
        }
      },
      debounceMs
    )
  )

  const save = useCallback(
    (args: {
      productId?: string | null
      palletDealId?: string | null
      quantity: number
      unitPrice: number
    }) => {
      saveRef.current(args)
    },
    []
  )

  return { save }
}
