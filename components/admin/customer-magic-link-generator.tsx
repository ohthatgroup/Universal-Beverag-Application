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
    customerId: string
    customerEmail: string
    deliveryDate: string
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
  const [magicLink, setMagicLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isDisabled = useMemo(() => !customerEmail || isGenerating, [customerEmail, isGenerating])

  const generate = async () => {
    setIsGenerating(true)
    setError(null)
    setCopied(false)
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

      const nextMagicLink = payload?.data?.magicLink ?? ''
      if (!nextMagicLink) {
        setError('Magic link was not returned by the server')
        return
      }

      setMagicLink(nextMagicLink)
    } catch {
      setError('Failed to generate magic link')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyLink = async () => {
    if (!magicLink) return
    try {
      await navigator.clipboard.writeText(magicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Unable to copy magic link')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer Magic Link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Generate a one-click login link for this customer that opens the selected delivery-date order page.
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

        {magicLink && (
          <div className="space-y-2">
            <Label htmlFor="magic-link-output">Magic Link</Label>
            <Input id="magic-link-output" readOnly value={magicLink} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={copyLink}>
                {copied ? 'Copied' : 'Copy Link'}
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
