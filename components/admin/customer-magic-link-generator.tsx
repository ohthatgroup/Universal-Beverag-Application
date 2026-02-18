'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, todayISODate } from '@/lib/utils'

interface CustomerMagicLinkGeneratorProps {
  customerId: string
  customerEmail: string | null
}

interface MagicLinkResponse {
  data?: {
    orderId: string
    customerId: string
    customerEmail: string
    deliveryDate: string
    orderDeepLink: string
    magicLink: string
  }
  error?: {
    message?: string
  }
}

export function CustomerMagicLinkGenerator({
  customerId,
  customerEmail,
}: CustomerMagicLinkGeneratorProps) {
  const [deliveryDate, setDeliveryDate] = useState(() => addDays(todayISODate(), 1))
  const [isGenerating, setIsGenerating] = useState(false)
  const [orderDeepLink, setOrderDeepLink] = useState('')
  const [magicLink, setMagicLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<'order' | 'magic' | null>(null)

  const isDisabled = useMemo(() => !customerEmail || isGenerating, [customerEmail, isGenerating])

  const generate = async () => {
    setIsGenerating(true)
    setError(null)
    setCopiedField(null)
    setOrderDeepLink('')
    setMagicLink('')

    try {
      const response = await fetch(`/api/customers/${customerId}/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deliveryDate }),
      })

      const payload = (await response.json().catch(() => null)) as MagicLinkResponse | null

      if (!response.ok) {
        setError(payload?.error?.message ?? 'Failed to generate magic link')
        return
      }

      const nextOrderDeepLink = payload?.data?.orderDeepLink ?? ''
      const nextMagicLink = payload?.data?.magicLink ?? ''
      if (!nextOrderDeepLink || !nextMagicLink) {
        setError('Order link payload was not returned by the server')
        return
      }

      setOrderDeepLink(nextOrderDeepLink)
      setMagicLink(nextMagicLink)
    } catch {
      setError('Failed to generate magic link')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyLink = async (target: 'order' | 'magic') => {
    const value = target === 'order' ? orderDeepLink : magicLink
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(target)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      setError(`Unable to copy ${target === 'order' ? 'order' : 'magic'} link`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer Magic Link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Generate a unique order link and one-click login link for this customer.
        </p>

        <div className="space-y-2">
          <Label htmlFor="magic-delivery-date">Delivery Date</Label>
          <Input
            id="magic-delivery-date"
            type="date"
            min={todayISODate()}
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
          />
        </div>

        <Button type="button" onClick={generate} disabled={isDisabled}>
          {isGenerating ? 'Generating...' : 'Generate Magic Link'}
        </Button>

        {!customerEmail && (
          <p className="text-sm text-destructive">
            Customer email is missing. Add an email above before generating a link.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {magicLink && orderDeepLink && (
          <div className="space-y-2">
            <Label htmlFor="order-link-output">Order Link</Label>
            <Input id="order-link-output" readOnly value={orderDeepLink} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => copyLink('order')}>
                {copiedField === 'order' ? 'Copied' : 'Copy Order Link'}
              </Button>
            </div>

            <Label htmlFor="magic-link-output">Magic Link</Label>
            <Input id="magic-link-output" readOnly value={magicLink} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => copyLink('magic')}>
                {copiedField === 'magic' ? 'Copied' : 'Copy Magic Link'}
              </Button>
              <Button asChild type="button" variant="outline">
                <a href={magicLink} target="_blank" rel="noreferrer">
                  Open Link
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
