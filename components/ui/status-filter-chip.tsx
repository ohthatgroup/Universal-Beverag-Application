import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { OrderStatusDot } from '@/components/ui/status-dot'
import type { OrderStatus } from '@/lib/types'

export interface StatusFilterChipProps {
  status: OrderStatus
  label: string
  href: string
  active: boolean
  className?: string
}

export function StatusFilterChip({ status, label, href, active, className }: StatusFilterChipProps) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border-border bg-background text-foreground hover:bg-muted',
        className
      )}
    >
      <OrderStatusDot status={status} aria-hidden />
      {label}
    </Link>
  )
}
