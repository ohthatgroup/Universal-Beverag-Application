import * as React from "react"

import { cn, formatCurrency } from "@/lib/utils"

export interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number
  compact?: boolean
}

export function Money({ value, compact, className, ...rest }: MoneyProps) {
  return (
    <span className={cn("tabular font-medium", className)} {...rest}>
      {formatCurrency(value, { compact })}
    </span>
  )
}
