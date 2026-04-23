import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        outline: "text-foreground",
        draft:
          "border-transparent bg-status-draft-bg text-status-draft",
        submitted:
          "border-transparent bg-status-submitted-bg text-status-submitted",
        delivered:
          "border-transparent bg-status-delivered-bg text-status-delivered",
        cancelled:
          "border-transparent bg-status-cancelled-bg text-status-cancelled",
        active:
          "border-transparent bg-status-active-bg text-status-active",
        inactive:
          "border-transparent bg-status-inactive-bg text-status-inactive",
        discontinued:
          "border-transparent bg-status-discontinued-bg text-status-discontinued",
        invited:
          "border-transparent bg-status-invited-bg text-status-invited",
        disabled:
          "border-transparent bg-status-disabled-bg text-status-disabled",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
