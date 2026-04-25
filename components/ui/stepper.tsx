'use client'

import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { surfaceFloatingRecessed } from '@/lib/design/surfaces'

interface StepperProps {
  quantity: number
  onChange: (next: number) => void
  min?: number
  // Visual size. `sm` for inline grid/list contexts (h-9), `md` for the
  // popout (h-10). Both render the same dug-in pill — only the metrics
  // differ.
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}

// Canonical stepper used everywhere on the customer surface. A single pill
// "dug into" the surrounding glass with an inset shadow, holding −, an
// editable number, and +. Tap-to-type the number for bulk entry; − / +
// nudge by one.
//
// Visual:
//   ┌─ surfaceFloatingRecessed ─┐
//   │  −     [ n ]    +         │
//   └───────────────────────────┘
export function Stepper({
  quantity,
  onChange,
  min = 0,
  size = 'sm',
  className,
  ariaLabel = 'Quantity',
}: StepperProps) {
  const [draft, setDraft] = useState(String(quantity))
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setDraft(String(quantity))
  }, [quantity])

  const commitDraft = () => {
    const parsed = Number.parseInt(draft, 10)
    const next = Number.isFinite(parsed) && parsed >= min ? parsed : min
    setDraft(String(next))
    if (next !== quantity) onChange(next)
  }

  const setNext = (next: number) => {
    const clamped = Math.max(min, next)
    setDraft(String(clamped))
    if (clamped !== quantity) onChange(clamped)
  }

  const dim = size === 'md' ? 'h-10 w-10' : 'h-9 w-9'
  const inputDim = size === 'md' ? 'h-10 w-10 text-base' : 'h-9 w-10 text-sm'

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full',
        surfaceFloatingRecessed,
        className,
      )}
    >
      <button
        type="button"
        aria-label={`${ariaLabel}: decrease`}
        className={cn(
          'flex flex-none items-center justify-center rounded-full transition',
          'hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40',
          dim,
        )}
        onClick={() => setNext(quantity - 1)}
        disabled={quantity <= min}
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(event) => {
          const cleaned = event.target.value.replace(/[^0-9]/g, '')
          setDraft(cleaned)
        }}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitDraft()
            inputRef.current?.blur()
          }
        }}
        aria-label={ariaLabel}
        className={cn(
          'min-w-0 bg-transparent text-center font-semibold tabular-nums',
          'focus:outline-none',
          inputDim,
        )}
      />
      <button
        type="button"
        aria-label={`${ariaLabel}: increase`}
        className={cn(
          'flex flex-none items-center justify-center rounded-full transition',
          'hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring',
          dim,
        )}
        onClick={() => setNext(quantity + 1)}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
