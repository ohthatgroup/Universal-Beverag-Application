'use client'

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Canonical trailing action cluster for list rows.
 *
 * Enforced order (left → right): Status → Reorder → Checkbox.
 * Slots are opt-in — omit any you don't need.
 */
interface RowActionsProps {
  status?: ReactNode
  reorder?: ReactNode
  checkbox?: ReactNode
  className?: string
}

export function RowActions({ status, reorder, checkbox, className }: RowActionsProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)} data-row-actions="true">
      {status ? <div className="flex items-center">{status}</div> : null}
      {reorder ? <div className="flex items-center">{reorder}</div> : null}
      {checkbox ? <div className="flex items-center">{checkbox}</div> : null}
    </div>
  )
}

interface RowReorderArrowsProps {
  onTop: () => void
  onUp: () => void
  onDown: () => void
  onBottom: () => void
  isFirst: boolean
  isLast: boolean
  disabled?: boolean
}

export function RowReorderArrows({ onTop, onUp, onDown, onBottom, isFirst, isLast, disabled }: RowReorderArrowsProps) {
  return (
    <div className="inline-flex items-center gap-1" data-no-row-nav="true">
      <ReorderButton
        onClick={onTop}
        disabled={disabled || isFirst}
        ariaLabel="Move to top"
      >
        <ArrowUpToLine className="h-4 w-4" />
      </ReorderButton>
      <ReorderButton
        onClick={onUp}
        disabled={disabled || isFirst}
        ariaLabel="Move up"
      >
        <ArrowUp className="h-4 w-4" />
      </ReorderButton>
      <ReorderButton
        onClick={onDown}
        disabled={disabled || isLast}
        ariaLabel="Move down"
      >
        <ArrowDown className="h-4 w-4" />
      </ReorderButton>
      <ReorderButton
        onClick={onBottom}
        disabled={disabled || isLast}
        ariaLabel="Move to bottom"
      >
        <ArrowDownToLine className="h-4 w-4" />
      </ReorderButton>
    </div>
  )
}

interface ReorderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel: string
}

function ReorderButton({ ariaLabel, children, onClick, disabled, ...rest }: ReorderButtonProps) {
  return (
    <button
      type="button"
      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
      onClick={(event) => {
        event.stopPropagation()
        onClick?.(event)
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  )
}

interface RowCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: string
}

export const RowCheckbox = forwardRef<HTMLInputElement, RowCheckboxProps>(function RowCheckbox(
  { label, className, onClick, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      className={cn('h-5 w-5 shrink-0', className)}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.(event)
      }}
      {...rest}
    />
  )
})
