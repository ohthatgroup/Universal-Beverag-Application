'use client'

import { Button } from '@/components/ui/button'

interface QuantitySelectorProps {
  quantity: number
  onChange: (quantity: number) => void
  min?: number
}

export function QuantitySelector({ quantity, onChange, min = 0 }: QuantitySelectorProps) {
  const isZero = quantity === 0
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`h-9 w-9 p-0 ${isZero ? 'opacity-50' : ''}`}
        onClick={() => onChange(Math.max(min, quantity - 1))}
      >
        -
      </Button>
      <span className={`w-9 text-center text-sm ${isZero ? 'text-muted-foreground' : 'font-semibold'}`}>
        {quantity}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-9 p-0"
        onClick={() => onChange(quantity + 1)}
      >
        +
      </Button>
    </div>
  )
}
