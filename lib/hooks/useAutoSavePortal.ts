'use client'

import { useCallback, useEffect, useRef } from 'react'
import { buildPortalItemSaveRequest } from '@/lib/portal-order-save'

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPayloadRef = useRef<{
    productId?: string | null
    palletDealId?: string | null
    quantity: number
    unitPrice: number
  } | null>(null)
  const inFlightRef = useRef<Set<Promise<void>>>(new Set())
  const flushRef = useRef<() => Promise<void>>(async () => {})

  const persist = useCallback(
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Customer-Token': token,
      }
      let requestData: ReturnType<typeof buildPortalItemSaveRequest>
      try {
        requestData = buildPortalItemSaveRequest({
          productId,
          palletDealId,
          quantity,
          unitPrice,
        })
      } catch (buildError) {
        const error =
          buildError instanceof Error
            ? buildError
            : new Error('Failed to prepare autosave request')
        onError?.(error)
        throw error
      }

      const response = await fetch(`/api/portal/orders/${orderId}/items`, {
        method: requestData.method,
        headers,
        body: JSON.stringify(requestData.body),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        const fallbackMessage =
          requestData.method === 'DELETE' ? 'Failed to delete item' : 'Failed to save item'
        const error = new Error(payload?.error?.message ?? fallbackMessage)
        onError?.(error)
        throw error
      }

      onSuccess?.()
    },
    [onError, onSuccess, orderId, token]
  )

  const runPersist = useCallback(
    async (payload: {
      productId?: string | null
      palletDealId?: string | null
      quantity: number
      unitPrice: number
    }) => {
      const operation = persist(payload)
      inFlightRef.current.add(operation)
      try {
        await operation
      } finally {
        inFlightRef.current.delete(operation)
      }
    },
    [persist]
  )

  const save = useCallback(
    (args: {
      productId?: string | null
      palletDealId?: string | null
      quantity: number
      unitPrice: number
    }) => {
      pendingPayloadRef.current = args

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        const payload = pendingPayloadRef.current
        pendingPayloadRef.current = null
        timerRef.current = null
        if (!payload) return
        void runPersist(payload).catch(() => undefined)
      }, debounceMs)
    },
    [debounceMs, runPersist]
  )

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const pendingPayload = pendingPayloadRef.current
    pendingPayloadRef.current = null

    if (pendingPayload) {
      await runPersist(pendingPayload)
    }

    await Promise.allSettled(Array.from(inFlightRef.current))
  }, [runPersist])

  flushRef.current = flush

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      void flushRef.current().catch(() => undefined)
    }
  }, [])

  return { save, flush }
}
