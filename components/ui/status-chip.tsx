import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getStatusLabel, getStatusVariant } from "@/lib/utils"
import type { OrderStatus } from "@/lib/types"

export interface StatusChipProps extends React.HTMLAttributes<HTMLDivElement> {
  status: OrderStatus
}

export function StatusChip({ status, className, ...rest }: StatusChipProps) {
  const label = getStatusLabel(status)
  return (
    <Badge
      variant={getStatusVariant(status)}
      className={cn("uppercase tracking-wide", className)}
      {...rest}
    >
      <span className="sr-only">Status: </span>
      {label}
    </Badge>
  )
}
