'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface LiveQuerySelectOption {
  value: string
  label: string
}

interface LiveQuerySelectProps {
  options: LiveQuerySelectOption[]
  paramKey: string
  initialValue: string
  className?: string
}

export function LiveQuerySelect({
  options,
  paramKey,
  initialValue,
  className,
}: LiveQuerySelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const value = useMemo(() => searchParams.get(paramKey) ?? initialValue, [searchParams, paramKey, initialValue])

  return (
    <select
      value={value}
      className={cn('h-9 rounded-md border bg-background px-3 text-sm', className)}
      onChange={(event) => {
        const nextValue = event.target.value
        const params = new URLSearchParams(searchParams.toString())
        if (nextValue && nextValue !== 'all') {
          params.set(paramKey, nextValue)
        } else {
          params.delete(paramKey)
        }

        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
