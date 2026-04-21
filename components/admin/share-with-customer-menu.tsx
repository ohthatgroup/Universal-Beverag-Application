'use client'

import { useState } from 'react'
import { Check, ChevronDown, Copy, Mail, MessageSquare, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ShareWithCustomerMenuProps {
  url: string
  smsBody?: string
  emailSubject?: string
  emailBody?: string
  size?: 'sm' | 'icon'
  align?: 'start' | 'center' | 'end'
  disabled?: boolean
  variant?: 'outline' | 'default'
}

function toAbsolute(rawUrl: string): string {
  if (typeof window === 'undefined') return rawUrl
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  const normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`
  return `${window.location.origin}${normalized}`
}

export function ShareWithCustomerMenu({
  url,
  smsBody,
  emailSubject,
  emailBody,
  size = 'sm',
  align = 'end',
  disabled = false,
  variant = 'outline',
}: ShareWithCustomerMenuProps) {
  const [copied, setCopied] = useState(false)

  const copy = async (e: React.MouseEvent | Event) => {
    e.preventDefault()
    if (typeof e.stopPropagation === 'function') e.stopPropagation()
    try {
      await navigator.clipboard.writeText(toAbsolute(url))
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* noop */
    }
  }

  const smsHref = (() => {
    if (typeof window === 'undefined') return '#'
    const body = smsBody ?? `Your order: ${toAbsolute(url)}`
    return `sms:?body=${encodeURIComponent(body)}`
  })()

  const mailtoHref = (() => {
    if (typeof window === 'undefined') return '#'
    const subject = emailSubject ?? 'Your order link'
    const body = emailBody ?? `Open your order: ${toAbsolute(url)}`
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  })()

  if (size === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            aria-label="Share with customer"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={copy}>
            {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy link'}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={smsHref} onClick={(e) => e.stopPropagation()}>
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              SMS
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={mailtoHref} onClick={(e) => e.stopPropagation()}>
              <Mail className="mr-2 h-3.5 w-3.5" />
              Email
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size="sm"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
        >
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={copy}>
          {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy link'}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={smsHref} onClick={(e) => e.stopPropagation()}>
            <MessageSquare className="mr-2 h-3.5 w-3.5" />
            SMS
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={mailtoHref} onClick={(e) => e.stopPropagation()}>
            <Mail className="mr-2 h-3.5 w-3.5" />
            Email
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
