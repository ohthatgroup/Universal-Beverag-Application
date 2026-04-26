'use client'

import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Send,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDeliveryDate } from '@/lib/utils'

interface ShareSubmittedOrderMenuProps {
  orderId: string
  customerName: string
  customerEmail: string | null
  deliveryDate: string
  shareLink: string
  csvHref: string
  markdownHref: string
  salesmanOfficeEmail: string | null
}

const OFFICE_BODY_CAP = 1800

function toAbsolute(rawUrl: string): string {
  if (typeof window === 'undefined') return rawUrl
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  const normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`
  return `${window.location.origin}${normalized}`
}

export function ShareSubmittedOrderMenu({
  orderId: _orderId,
  customerName,
  customerEmail,
  deliveryDate,
  shareLink,
  csvHref,
  markdownHref,
  salesmanOfficeEmail,
}: ShareSubmittedOrderMenuProps) {
  const [copiedMd, setCopiedMd] = useState(false)
  const [working, setWorking] = useState(false)

  const deliveryLabel = formatDeliveryDate(deliveryDate)
  const absShareLink = toAbsolute(shareLink)
  const subject = `Order for ${customerName} — delivery ${deliveryLabel}`

  const smsHref = `sms:?body=${encodeURIComponent(`Review your order: ${absShareLink}`)}`
  const customerMailto = customerEmail
    ? `mailto:${customerEmail}?subject=${encodeURIComponent(`Your order — ${deliveryLabel}`)}&body=${encodeURIComponent(`Review your order here: ${absShareLink}`)}`
    : '#'

  const fetchMarkdown = async (): Promise<string | null> => {
    try {
      const res = await fetch(markdownHref)
      if (!res.ok) return null
      return await res.text()
    } catch {
      return null
    }
  }

  const copyMarkdown = async () => {
    if (working) return
    setWorking(true)
    try {
      const md = await fetchMarkdown()
      if (!md) return
      await navigator.clipboard.writeText(md)
      setCopiedMd(true)
      setTimeout(() => setCopiedMd(false), 1500)
    } catch {
      /* noop */
    } finally {
      setWorking(false)
    }
  }

  const triggerCsvDownload = () => {
    if (typeof window === 'undefined') return
    const anchor = document.createElement('a')
    anchor.href = csvHref
    anchor.download = ''
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  const emailToOffice = async () => {
    if (!salesmanOfficeEmail || working) return
    setWorking(true)
    try {
      const md = await fetchMarkdown()
      let body = md ?? `Review the order: ${absShareLink}`
      if (body.length > OFFICE_BODY_CAP) {
        body = `${body.slice(0, OFFICE_BODY_CAP)}\n\n…truncated — see CSV attached`
        triggerCsvDownload()
      }
      const href = `mailto:${salesmanOfficeEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.location.href = href
    } finally {
      setWorking(false)
    }
  }

  const officeDisabled = !salesmanOfficeEmail

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" className="gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
          Share
          <ChevronDown className="ml-0.5 h-3.5 w-3.5 opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Share with customer
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={smsHref}>
            <MessageSquare className="mr-2 h-3.5 w-3.5" />
            SMS
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild disabled={!customerEmail}>
          <a href={customerMailto}>
            <Mail className="mr-2 h-3.5 w-3.5" />
            Email
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a href={csvHref} download>
            <Download className="mr-2 h-3.5 w-3.5" />
            Download CSV
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            void copyMarkdown()
          }}
        >
          {copiedMd ? (
            <Check className="mr-2 h-3.5 w-3.5" />
          ) : (
            <FileText className="mr-2 h-3.5 w-3.5" />
          )}
          {copiedMd ? 'Copied' : 'Copy as markdown'}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          To office
        </DropdownMenuLabel>
        <DropdownMenuItem
          disabled={officeDisabled}
          onSelect={(e) => {
            e.preventDefault()
            if (!officeDisabled) void emailToOffice()
          }}
        >
          <Send className="mr-2 h-3.5 w-3.5" />
          {salesmanOfficeEmail ? (
            <span className="whitespace-normal break-all leading-snug">
              Email to {salesmanOfficeEmail}
            </span>
          ) : (
            <span>Email to office</span>
          )}
        </DropdownMenuItem>
        {officeDisabled ? (
          <p className="px-2 pb-2 pt-0.5 text-xs text-muted-foreground">
            Set an office email in your{' '}
            <a
              href="/admin/settings"
              className="underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              settings
            </a>
            .
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
