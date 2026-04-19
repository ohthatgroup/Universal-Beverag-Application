import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface OutcomeScreenProps {
  icon?: LucideIcon
  tone?: "neutral" | "success" | "warning" | "error"
  title: string
  description?: React.ReactNode
  primary?: React.ReactNode
  secondary?: React.ReactNode
  className?: string
}

const toneClasses: Record<NonNullable<OutcomeScreenProps["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-status-delivered-bg text-status-delivered",
  warning: "bg-status-submitted-bg text-status-submitted",
  error: "bg-status-cancelled-bg text-status-cancelled",
}

export function OutcomeScreen({
  icon: Icon,
  tone = "neutral",
  title,
  description,
  primary,
  secondary,
  className,
}: OutcomeScreenProps) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-6 flex size-14 items-center justify-center rounded-full",
            toneClasses[tone]
          )}
        >
          <Icon className="size-7" aria-hidden />
        </div>
      )}
      <h1 className="text-h1 text-foreground">{title}</h1>
      {description && (
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      )}
      {(primary || secondary) && (
        <div className="mt-8 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
          {primary}
          {secondary}
        </div>
      )}
    </div>
  )
}
