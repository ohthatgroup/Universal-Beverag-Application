import * as React from 'react'
import { cn } from '@/lib/utils'
import { getStatusLabel } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

export type StatusTone =
  | 'draft'
  | 'submitted'
  | 'delivered'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'discontinued'
  | 'invited'
  | 'disabled'

const TONE_DOT_CLASSES: Record<StatusTone, string> = {
  draft: 'bg-status-draft',
  submitted: 'bg-status-submitted',
  delivered: 'bg-status-delivered',
  cancelled: 'bg-status-cancelled',
  active: 'bg-status-active',
  inactive: 'bg-status-inactive',
  discontinued: 'bg-status-discontinued',
  invited: 'bg-status-invited',
  disabled: 'bg-status-disabled',
}

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone
  label?: string
}

export function StatusDot({ tone, label, className, ...rest }: StatusDotProps) {
  return (
    <span
      aria-label={label ? `Status: ${label}` : undefined}
      title={label}
      role={label ? 'img' : undefined}
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', TONE_DOT_CLASSES[tone], className)}
      {...rest}
    />
  )
}

const ORDER_TONE: Record<OrderStatus, StatusTone> = {
  draft: 'draft',
  submitted: 'submitted',
  delivered: 'delivered',
}

export interface OrderStatusDotProps extends Omit<StatusDotProps, 'tone' | 'label'> {
  status: OrderStatus
}

export function OrderStatusDot({ status, ...rest }: OrderStatusDotProps) {
  return <StatusDot tone={ORDER_TONE[status]} label={getStatusLabel(status)} {...rest} />
}

export type ProductLifecycle = 'active' | 'discontinued'
const PRODUCT_TONE: Record<ProductLifecycle, StatusTone> = {
  active: 'active',
  discontinued: 'discontinued',
}
const PRODUCT_LABELS: Record<ProductLifecycle, string> = {
  active: 'Active',
  discontinued: 'Discontinued',
}

export interface ProductStatusDotProps extends Omit<StatusDotProps, 'tone' | 'label'> {
  lifecycle: ProductLifecycle
}

export function ProductStatusDot({ lifecycle, ...rest }: ProductStatusDotProps) {
  return <StatusDot tone={PRODUCT_TONE[lifecycle]} label={PRODUCT_LABELS[lifecycle]} {...rest} />
}

export type StaffStatus = 'active' | 'invited' | 'disabled'
const STAFF_TONE: Record<StaffStatus, StatusTone> = {
  active: 'active',
  invited: 'invited',
  disabled: 'disabled',
}
const STAFF_LABELS: Record<StaffStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  disabled: 'Disabled',
}

export interface StaffStatusDotProps extends Omit<StatusDotProps, 'tone' | 'label'> {
  status: StaffStatus
}

export function StaffStatusDot({ status, ...rest }: StaffStatusDotProps) {
  return <StatusDot tone={STAFF_TONE[status]} label={STAFF_LABELS[status]} {...rest} />
}

export interface PalletStatusDotProps extends Omit<StatusDotProps, 'tone' | 'label'> {
  isActive: boolean
}

export function PalletStatusDot({ isActive, ...rest }: PalletStatusDotProps) {
  return (
    <StatusDot
      tone={isActive ? 'active' : 'inactive'}
      label={isActive ? 'Active' : 'Inactive'}
      {...rest}
    />
  )
}
