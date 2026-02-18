'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface OrderLinkActionsProps {
  orderId: string
  className?: string
}

interface OrderMagicLinkResponse {
  data?: {
    orderId: string
    customerId: string
    customerEmail: string
    orderDeepLink: string
    magicLink: string
  }
  error?: {
    message?: string
  }
}

export function OrderLinkActions({ orderId, className }: OrderLinkActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderDeepLink, setOrderDeepLink] = useState('')
  const [magicLink, setMagicLink] = useState('')
  const [copiedField, setCopiedField] = useState<'order' | 'magic' | null>(null)

  const generate = async () => {
    setIsLoading(true)
    setError(null)
    setCopiedField(null)
    try {
      const response = await fetch(`/api/orders/${orderId}/magic-link`, {
        method: 'POST',
      })

      const payload = (await response.json().catch(() => null)) as OrderMagicLinkResponse | null
      if (!response.ok) {
        setError(payload?.error?.message ?? 'Failed to generate order links')
        return
      }

      const deepLink = payload?.data?.orderDeepLink ?? ''
      const magic = payload?.data?.magicLink ?? ''
      if (!deepLink || !magic) {
        setError('Order link payload was not returned by the server')
        return
      }

      setOrderDeepLink(deepLink)
      setMagicLink(magic)
    } catch {
      setError('Failed to generate order links')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (target: 'order' | 'magic') => {
    const value = target === 'order' ? orderDeepLink : magicLink
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(target)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      setError('Unable to copy link')
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={generate} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Links'}
        </Button>
        {orderDeepLink && (
          <Button type="button" size="sm" variant="secondary" onClick={() => copyToClipboard('order')}>
            {copiedField === 'order' ? 'Copied' : 'Copy Order Link'}
          </Button>
        )}
        {magicLink && (
          <>
            <Button type="button" size="sm" variant="secondary" onClick={() => copyToClipboard('magic')}>
              {copiedField === 'magic' ? 'Copied' : 'Copy Magic Link'}
            </Button>
            <Button asChild type="button" size="sm" variant="ghost">
              <a href={magicLink} target="_blank" rel="noreferrer">
                Open Magic Link
              </a>
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
