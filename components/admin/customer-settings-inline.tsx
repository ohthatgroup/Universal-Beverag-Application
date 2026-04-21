'use client'

import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

type GroupOption = 'brand' | 'size'

interface CustomerSettingsInlineProps {
  customerId: string
  initialShowPrices: boolean
  initialCustomPricing: boolean
  initialDefaultGroup: GroupOption
}

type FieldKey = 'showPrices' | 'customPricing' | 'defaultGroup'
type FieldState = 'idle' | 'saving' | 'saved' | 'error'

export function CustomerSettingsInline({
  customerId,
  initialShowPrices,
  initialCustomPricing,
  initialDefaultGroup,
}: CustomerSettingsInlineProps) {
  const [showPrices, setShowPrices] = useState(initialShowPrices)
  const [customPricing, setCustomPricing] = useState(initialCustomPricing)
  const [defaultGroup, setDefaultGroup] = useState<GroupOption>(initialDefaultGroup)
  const [state, setState] = useState<Record<FieldKey, FieldState>>({
    showPrices: 'idle',
    customPricing: 'idle',
    defaultGroup: 'idle',
  })

  const save = async (key: FieldKey, body: Record<string, unknown>, revert: () => void) => {
    setState((s) => ({ ...s, [key]: 'saving' }))
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('save failed')
      setState((s) => ({ ...s, [key]: 'saved' }))
      setTimeout(() => {
        setState((s) => (s[key] === 'saved' ? { ...s, [key]: 'idle' } : s))
      }, 1200)
    } catch {
      revert()
      setState((s) => ({ ...s, [key]: 'error' }))
    }
  }

  const toggleShowPrices = (next: boolean) => {
    const prev = showPrices
    setShowPrices(next)
    save('showPrices', { showPrices: next }, () => setShowPrices(prev))
  }

  const toggleCustomPricing = (next: boolean) => {
    const prev = customPricing
    setCustomPricing(next)
    save('customPricing', { customPricing: next }, () => setCustomPricing(prev))
  }

  const changeGroup = (next: GroupOption) => {
    const prev = defaultGroup
    setDefaultGroup(next)
    save('defaultGroup', { defaultGroup: next }, () => setDefaultGroup(prev))
  }

  return (
    <ul className="divide-y rounded-xl border bg-card text-sm">
      <SettingRow
        label="Show prices"
        state={state.showPrices}
        control={<Switch checked={showPrices} onCheckedChange={toggleShowPrices} aria-label="Show prices" />}
        onRetry={() => toggleShowPrices(showPrices)}
      />
      <SettingRow
        label="Custom pricing"
        state={state.customPricing}
        control={<Switch checked={customPricing} onCheckedChange={toggleCustomPricing} aria-label="Custom pricing" />}
        onRetry={() => toggleCustomPricing(customPricing)}
      />
      <SettingRow
        label="Default grouping"
        state={state.defaultGroup}
        control={
          <select
            value={defaultGroup}
            onChange={(e) => changeGroup(e.target.value as GroupOption)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
            aria-label="Default grouping"
          >
            <option value="brand">Brand</option>
            <option value="size">Size</option>
          </select>
        }
        onRetry={() => changeGroup(defaultGroup)}
      />
    </ul>
  )
}

function SettingRow({
  label,
  state,
  control,
  onRetry,
}: {
  label: string
  state: FieldState
  control: React.ReactNode
  onRetry: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-xs transition-opacity',
            state === 'saved' && 'text-green-600 opacity-100',
            state === 'saving' && 'text-muted-foreground opacity-100',
            state === 'idle' && 'opacity-0',
          )}
          aria-live="polite"
        >
          {state === 'saving' && 'Saving…'}
          {state === 'saved' && (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </span>
        {state === 'error' && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <RotateCcw className="h-3 w-3" /> Retry
          </button>
        )}
        {control}
      </div>
    </li>
  )
}
