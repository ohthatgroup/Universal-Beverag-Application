'use client'

import { useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { debounce } from '@/lib/utils'
import type { OrderItemInsert } from '@/lib/types'

interface UseAutoSaveOptions {
  orderId: string
  onError?: (error: Error) => void
  onSuccess?: () => void
  debounceMs?: number
}

export function useAutoSave({
  orderId,
  onError,
  onSuccess,
  debounceMs = 300,
}: UseAutoSaveOptions) {
  const supabase = createClient()

  // useRef prevents creating a new debounce timer on every render
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
        if (quantity === 0) {
          // Delete the row when quantity reaches zero
          const query = supabase
            .from('order_items')
            .delete()
            .eq('order_id', orderId)

          if (productId) {
            await query.eq('product_id', productId)
          } else if (palletDealId) {
            await query.eq('pallet_deal_id', palletDealId)
          }
        } else {
          const payload: OrderItemInsert = {
            order_id: orderId,
            quantity,
            unit_price: unitPrice,
            product_id: productId ?? null,
            pallet_deal_id: palletDealId ?? null,
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('order_items')
            .upsert(payload, {
              onConflict: productId
                ? 'order_id,product_id'
                : 'order_id,pallet_deal_id',
            })

          if (error) {
            onError?.(new Error(error.message))
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
