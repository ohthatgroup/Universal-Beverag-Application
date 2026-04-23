'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { presetsClient } from '@/lib/admin/presets-client'

export interface PresetOption {
  id: string
  name: string
  summary: string
}

interface ApplyPresetMenuProps {
  customerId: string
  customerName: string
  currentSummary: string | null
  presets: PresetOption[]
}

export function ApplyPresetMenu({
  customerId,
  customerName,
  currentSummary,
  presets,
}: ApplyPresetMenuProps) {
  const router = useRouter()
  const [pending, setPending] = useState<PresetOption | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmApply = async () => {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      await presetsClient.applyToCustomer(pending.id, customerId)
      setPending(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply preset')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Catalog visibility
      </h2>
      <div className="rounded-xl border bg-card p-3 text-sm">
        <div className="text-muted-foreground">
          {currentSummary ?? 'No restrictions — full catalog visible'}
        </div>
        {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}
        <div className="mt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Apply preset
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[14rem]">
              {presets.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  No presets yet.
                </div>
              ) : (
                presets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onSelect={(event) => {
                      event.preventDefault()
                      setPending(preset)
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">{preset.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {preset.summary}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConfirmSheet
        open={pending !== null}
        onOpenChange={(next) => {
          if (!next && !busy) setPending(null)
        }}
        title={pending ? `Apply "${pending.name}"?` : ''}
        description={
          pending ? (
            <>
              Replaces {customerName}&apos;s current visibility rules with{' '}
              <span className="font-medium">{pending.name}</span> ({pending.summary}).
              Favorites and custom prices stay.
            </>
          ) : null
        }
        confirmLabel="Apply preset"
        pendingLabel="Applying…"
        pending={busy}
        destructive={false}
        onConfirm={() => void confirmApply()}
      />
    </section>
  )
}
