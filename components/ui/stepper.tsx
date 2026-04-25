'use client'

import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { surfaceFloatingRecessed } from '@/lib/design/surfaces'

interface StepperProps {
  quantity: number
  onChange: (next: number) => void
  min?: number
  /**
   * Hard cap for both stepper increments and the editable input. Defaults
   * to 999 — any larger value is clamped on commit. Set higher only with
   * a domain reason.
   */
  max?: number
  // Visual size. `sm` for inline grid/list contexts (h-9), `md` for the
  // popout (h-10). Both render the same dug-in pill — only the metrics
  // differ.
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}

const DEFAULT_MAX = 999

// Canonical stepper used everywhere on the customer surface. A single pill
// "dug into" the surrounding glass with an inset shadow, holding −, an
// editable number, and +. Tap-to-type the number for bulk entry; − / +
// nudge by one.
//
// Rapid-fire clicks: handlers read the latest committed value from a ref,
// not the closure-captured `quantity` prop, so multiple synchronous clicks
// accumulate correctly even before the parent re-renders.
//
// Clamp: values above `max` are clamped on commit. The user sees their
// typed value momentarily, then it snaps to the cap on blur or Enter.
export function Stepper({
  quantity,
  onChange,
  min = 0,
  max = DEFAULT_MAX,
  size = 'sm',
  className,
  ariaLabel = 'Quantity',
}: StepperProps) {
  const [draft, setDraft] = useState(String(quantity))
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Mirrors the latest committed value so rapid clicks don't read a stale
  // `quantity` prop. Updated synchronously inside setNext.
  const valueRef = useRef<number>(quantity)

  useEffect(() => {
    valueRef.current = quantity
    setDraft(String(quantity))
  }, [quantity])

  const setNext = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next))
    valueRef.current = clamped
    setDraft(String(clamped))
    onChange(clamped)
  }

  const commitDraft = () => {
    const parsed = Number.parseInt(draft, 10)
    const next = Number.isFinite(parsed) ? parsed : min
    const clamped = Math.min(max, Math.max(min, next))
    setDraft(String(clamped))
    if (clamped !== valueRef.current) {
      valueRef.current = clamped
      onChange(clamped)
    } else if (next !== clamped) {
      // Typed value was out of range; snap visible draft back even if no
      // onChange fires (parent already has the canonical value).
      setDraft(String(clamped))
    }
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
          'hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          dim,
        )}
        onClick={() => setNext(valueRef.current - 1)}
        disabled={valueRef.current <= min}
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
          'disabled:opacity-40 disabled:cursor-not-allowed',
          dim,
        )}
        onClick={() => setNext(valueRef.current + 1)}
        disabled={valueRef.current >= max}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
