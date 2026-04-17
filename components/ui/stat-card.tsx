import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"

export interface StatCardProps {
  label: string
  value: React.ReactNode
  delta?: { value: string; direction: "up" | "down" | "flat" }
  href?: string
  className?: string
}

export function StatCard({ label, value, delta, href, className }: StatCardProps) {
  const body = (
    <div
      className={cn(
        "group relative flex flex-col justify-between gap-2 rounded-lg border bg-card p-5 shadow-sm transition-shadow",
        href && "hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {href && (
          <ArrowUpRight
            className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        )}
      </div>
      <p className="text-h1 tabular text-foreground">{value}</p>
      {delta && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium tabular",
            delta.direction === "up" && "text-success",
            delta.direction === "down" && "text-destructive",
            delta.direction === "flat" && "text-muted-foreground"
          )}
        >
          {delta.direction === "up" && <TrendingUp className="size-3.5" aria-hidden />}
          {delta.direction === "down" && <TrendingDown className="size-3.5" aria-hidden />}
          <span>{delta.value}</span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    )
  }
  return body
}
