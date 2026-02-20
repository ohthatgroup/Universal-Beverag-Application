'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CopyUrlButtonProps {
  url: string
  label?: string
  title?: string
  iconOnly?: boolean
  className?: string
}

export function toAbsoluteUrl(rawUrl: string, origin: string): string {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl
  }
  const normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`
  return `${origin}${normalized}`
}

export function CopyUrlButton({
  url,
  label = 'Copy URL',
  title = 'Copy URL',
  iconOnly = false,
  className,
}: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    await navigator.clipboard.writeText(toAbsoluteUrl(url, window.location.origin))
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? 'icon' : 'sm'}
      title={title}
      className={cn(iconOnly ? 'h-7 w-7 p-0' : '', className)}
      onClick={copy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {!iconOnly ? (copied ? 'Copied' : label) : null}
    </Button>
  )
}
