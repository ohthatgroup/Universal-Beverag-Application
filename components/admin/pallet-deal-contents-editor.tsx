'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

  const flushPersist = (productId: string) => {
    const pending = timersRef.current.get(productId)
    if (pending) {
      clearTimeout(pending)
      timersRef.current.delete(productId)
    }
    void persistQuantity(productId, quantities[productId] ?? 0)
  }

  const toggleSingle = (rowId: string) => {
    const current = quantities[rowId] ?? 0
    const nextQuantity = current > 0 ? 0 : 1
    setQuantities((prev) => ({ ...prev, [rowId]: nextQuantity }))
    void persistQuantity(rowId, nextQuantity)
  }

  const updateMixed = (rowId: string, rawValue: string) => {
    const parsed = Number(rawValue)
    const nextQuantity = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
    setQuantities((prev) => ({ ...prev, [rowId]: nextQuantity }))
    schedulePersist(rowId, nextQuantity)
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
            <div key={row.id} className="flex flex-wrap items-center gap-2 border-b py-2.5 last:border-0">
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <div className={`truncate text-sm ${hasQuantity ? 'font-medium' : 'text-muted-foreground'}`}>
                  {row.title}
                </div>
                <div className="text-xs text-muted-foreground">{row.packLabel}</div>
              </div>
              {palletType === 'single' ? (
                <Button
                  size="sm"
                  variant={hasQuantity ? 'default' : 'outline'}
                  onClick={() => toggleSingle(row.id)}
                  disabled={isSaving}
                >
                  {hasQuantity ? 'Selected' : 'Select'}
                </Button>
              ) : (
                <Input
                  className="h-8 w-20 text-right text-xs"
                  type="number"
                  min="0"
                  value={String(quantity)}
                  onChange={(event) => updateMixed(row.id, event.target.value)}
                  onBlur={() => flushPersist(row.id)}
                />
              )}
              {isSaving ? <span className="text-xs text-muted-foreground">Saving...</span> : null}
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
