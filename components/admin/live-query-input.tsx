'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface LiveQueryInputProps {
  placeholder: string
  initialValue?: string
  paramKey?: string
  debounceMs?: number
  className?: string
}

export function LiveQueryInput({
  placeholder,
  initialValue = '',
  paramKey = 'q',
  debounceMs = 300,
  className,
}: LiveQueryInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const paramsString = useMemo(() => searchParams.toString(), [searchParams])

  useEffect(() => {
    const externalValue = searchParams.get(paramKey) ?? ''
    setValue(externalValue)
  }, [searchParams, paramKey])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const push = (nextValue: string) => {
    const next = nextValue.trim()
    const params = new URLSearchParams(paramsString)

    if (next) {
      params.set(paramKey, next)
    } else {
      params.delete(paramKey)
    }

    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value
          setValue(nextValue)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => push(nextValue), debounceMs)
        }}
        className="pl-9"
      />
    </div>
  )
}
