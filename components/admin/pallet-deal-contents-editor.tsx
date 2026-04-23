'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { QuantitySelector } from '@/components/catalog/quantity-selector'

type PalletType = 'single' | 'mixed'

export interface PalletDealContentRow {
  id: string
  title: string
  packLabel: string
  quantity: number
}

interface PalletDealContentsEditorProps {
  palletDealId: string
  palletType: PalletType
  rows: PalletDealContentRow[]
}

export function PalletDealContentsEditor({
  palletDealId,
  palletType,
  rows,
}: PalletDealContentsEditorProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {}
    for (const row of rows) {
      next[row.id] = row.quantity
    }
    return next
  })
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const next: Record<string, number> = {}
    for (const row of rows) {
      next[row.id] = row.quantity
    }
    setQuantities(next)
  }, [rows])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  const includedCount = useMemo(
    () => rows.filter((row) => (quantities[row.id] ?? 0) > 0).length,
    [rows, quantities]
  )

  const persistQuantity = async (productId: string, quantity: number) => {
    setSavingIds((prev) => {
      const next = new Set(prev)
      next.add(productId)
      return next
    })
    setError(null)

    try {
      const response = await fetch(`/api/admin/pallet-deals/${palletDealId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to save deal item')
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save deal item')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const schedulePersist = (productId: string, quantity: number) => {
    const existing = timersRef.current.get(productId)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = setTimeout(() => {
      timersRef.current.delete(productId)
      void persistQuantity(productId, quantity)
    }, 320)
    timersRef.current.set(productId, timer)
  }

  const persistUpdates = async (updates: Array<{ productId: string; quantity: number }>) => {
    for (const update of updates) {
      // Sequential writes keep UI and DB consistent for single-selection updates.
      // eslint-disable-next-line no-await-in-loop
      await persistQuantity(update.productId, update.quantity)
    }
  }

  const changeSingle = (rowId: string, rawNext: number) => {
    const next = Math.max(0, Math.min(1, Math.floor(rawNext)))
    const current = quantities[rowId] ?? 0
    if (next === current) return

    if (next === 0) {
      setQuantities((prev) => ({ ...prev, [rowId]: 0 }))
      void persistQuantity(rowId, 0)
      return
    }

    const currentlySelectedOtherIds = Object.entries(quantities)
      .filter(([id, quantity]) => id !== rowId && quantity > 0)
      .map(([id]) => id)

    setQuantities((prev) => {
      const nextState = { ...prev, [rowId]: 1 }
      for (const [id, quantity] of Object.entries(nextState)) {
        if (id !== rowId && quantity > 0) {
          nextState[id] = 0
        }
      }
      return nextState
    })

    void persistUpdates([
      ...currentlySelectedOtherIds.map((id) => ({ productId: id, quantity: 0 })),
      { productId: rowId, quantity: 1 },
    ])
  }

  const changeMixed = (rowId: string, nextValue: number) => {
    const clamped = Math.max(0, Math.floor(nextValue))
    setQuantities((prev) => ({ ...prev, [rowId]: clamped }))
    schedulePersist(rowId, clamped)
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        {includedCount} included
      </div>
      <div className="max-h-[68vh] space-y-0 overflow-y-auto sm:max-h-[600px]">
        {rows.map((row) => {
          const quantity = quantities[row.id] ?? 0
          const hasQuantity = quantity > 0
          const isSaving = savingIds.has(row.id)

          return (
            <div key={row.id} className="flex items-center gap-3 border-b py-2.5 last:border-0">
              <div className="shrink-0">
                <QuantitySelector
                  quantity={quantity}
                  onChange={(next) =>
                    palletType === 'single' ? changeSingle(row.id, next) : changeMixed(row.id, next)
                  }
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm ${hasQuantity ? 'font-medium' : 'text-muted-foreground'}`}>
                  {row.title}
                </div>
                <div className="text-xs text-muted-foreground">{row.packLabel}</div>
              </div>
              {isSaving ? <span className="shrink-0 text-xs text-muted-foreground">Saving...</span> : null}
            </div>
          )
        })}
        {rows.length === 0 && (
          <div className="py-4 text-sm text-muted-foreground">No deal items found.</div>
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
