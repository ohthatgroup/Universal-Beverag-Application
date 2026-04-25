'use client'

import * as React from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Three-dot blinking indicator. Each dot pulses with a staggered delay so the
// effect reads as a continuous "..." being typed rather than three dots
// flashing in sync. Uses non-breaking inline spans so the dots stay on the
// same line as the label.
export function AnimatedDots({ className }: { className?: string }) {
  return (
    <span className={cn('whitespace-nowrap', className)} aria-hidden>
      <span className="animate-pulse [animation-delay:0ms]">.</span>
      <span className="animate-pulse [animation-delay:200ms]">.</span>
      <span className="animate-pulse [animation-delay:400ms]">.</span>
    </span>
  )
}

export interface PendingButtonProps extends ButtonProps {
  pending?: boolean
  // Label shown when `pending` is true. Defaults to the button's children.
  pendingLabel?: React.ReactNode
}

// Thin wrapper around <Button> that adds a "pending" state with a blinking
// dot ellipsis. Disables the button while pending so consumers don't have to
// remember to also pass `disabled`. Used wherever a click triggers a network
// round-trip plus an RSC refresh — keeps the button visibly busy until the
// refreshed UI commits.
export const PendingButton = React.forwardRef<
  HTMLButtonElement,
  PendingButtonProps
>(({ pending = false, pendingLabel, children, disabled, ...props }, ref) => {
  const label = pending && pendingLabel ? pendingLabel : children
  return (
    <Button ref={ref} disabled={pending || disabled} aria-busy={pending} {...props}>
      <span className="inline-flex items-center">
        {label}
        {pending && <AnimatedDots className="ml-0.5" />}
      </span>
    </Button>
  )
})
PendingButton.displayName = 'PendingButton'
