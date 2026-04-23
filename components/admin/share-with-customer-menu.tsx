'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareWithCustomerMenuProps {
  url: string
  label?: string
  disabled?: boolean
  className?: string
}

function toAbsolute(rawUrl: string): string {
  if (typeof window === 'undefined') return rawUrl
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  const normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`
  return `${window.location.origin}${normalized}`
}

export function ShareWithCustomerMenu({
  url,
  label = 'Copy draft link',
  disabled = false,
  className,
}: ShareWithCustomerMenuProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toAbsolute(url))
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* noop */
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={copy}
      className={className}
    >
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  )
}
