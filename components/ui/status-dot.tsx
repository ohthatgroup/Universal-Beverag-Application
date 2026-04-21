import * as React from 'react'
import { cn } from '@/lib/utils'
import { getStatusLabel } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

export const STATUS_DOT_CLASSES: Record<OrderStatus, string> = {
  draft: 'bg-muted-foreground/60',
  submitted: 'bg-blue-500',
  delivered: 'bg-green-500',
}

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: OrderStatus
}

export function StatusDot({ status, className, ...rest }: StatusDotProps) {
  const label = getStatusLabel(status)
  return (
    <span
      aria-label={`Status: ${label}`}
      title={label}
      role="img"
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASSES[status], className)}
      {...rest}
    />
  )
}
