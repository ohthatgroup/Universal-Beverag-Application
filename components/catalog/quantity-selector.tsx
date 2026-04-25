'use client'

import { Stepper } from '@/components/ui/stepper'

interface QuantitySelectorProps {
  quantity: number
  onChange: (quantity: number) => void
  min?: number
}

// Legacy alias for the canonical <Stepper /> primitive. Consumers that
// still import QuantitySelector get the new visual + behavior for free.
// Schedule rename to Stepper in a follow-up cleanup pass.
export function QuantitySelector({ quantity, onChange, min = 0 }: QuantitySelectorProps) {
  return <Stepper quantity={quantity} onChange={onChange} min={min} />
}
