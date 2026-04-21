'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AdminFabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
}

export const AdminFab = forwardRef<HTMLButtonElement, AdminFabProps>(
  function AdminFab({ icon, label, className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          'fixed bottom-6 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg backdrop-blur transition-transform hover:scale-105 disabled:opacity-60 md:bottom-8',
          className
        )}
        {...rest}
      >
        {icon}
      </button>
    )
  }
)
