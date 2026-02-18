'use client'

import { Button } from '@/components/ui/button'

interface QuantitySelectorProps {
  quantity: number
  onChange: (quantity: number) => void
  min?: number
}

export function QuantitySelector({ quantity, onChange, min = 0 }: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onChange(Math.max(min, quantity - 1))}
      >
        -
      </Button>
      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onChange(quantity + 1)}
      >
        +
      </Button>
    </div>
  )
}
