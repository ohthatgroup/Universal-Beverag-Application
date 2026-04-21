'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PresetKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom'

interface PresetDef {
  key: PresetKey
  label: string
}

const PRESETS: PresetDef[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'custom', label: 'Custom' },
]

const chipBase =
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap'
const chipActive = 'border-accent bg-accent text-accent-foreground'
const chipIdle = 'border-border bg-background text-foreground hover:border-foreground/40'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function rangeFor(key: Exclude<PresetKey, 'custom'>): { from: string; to: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (key) {
    case 'today':
      return { from: toISO(today), to: toISO(today) }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { from: toISO(y), to: toISO(y) }
    }
    case 'last7': {
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      return { from: toISO(start), to: toISO(today) }
    }
    case 'last30': {
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      return { from: toISO(start), to: toISO(today) }
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: toISO(start), to: toISO(today) }
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: toISO(start), to: toISO(end) }
    }
  }
}

function detectActive(from: string, to: string): PresetKey {
  for (const preset of PRESETS) {
    if (preset.key === 'custom') continue
    const range = rangeFor(preset.key as Exclude<PresetKey, 'custom'>)
    if (range.from === from && range.to === to) return preset.key
  }
  return 'custom'
}

interface ReportDatePresetsProps {
  from: string
  to: string
}

export function ReportDatePresets({ from, to }: ReportDatePresetsProps) {
  const router = useRouter()
  const [active, setActive] = useState<PresetKey>(() => detectActive(from, to))
  const [customFrom, setCustomFrom] = useState(from)
  const [customTo, setCustomTo] = useState(to)

  const pushRange = (nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams()
    params.set('from', nextFrom)
    params.set('to', nextTo)
    router.push(`/admin/reports?${params.toString()}`)
  }

  const handlePreset = (key: PresetKey) => {
    setActive(key)
    if (key === 'custom') return
    const range = rangeFor(key)
    setCustomFrom(range.from)
    setCustomTo(range.to)
    pushRange(range.from, range.to)
  }

  const submitCustom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    pushRange(customFrom, customTo)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const isActive = preset.key === active
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => handlePreset(preset.key)}
              className={cn(chipBase, isActive ? chipActive : chipIdle)}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {active === 'custom' && (
        <form
          onSubmit={submitCustom}
          className="grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              name="from"
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              name="to"
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Run report</Button>
          </div>
        </form>
      )}
    </div>
  )
}
