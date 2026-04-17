'use client'

import { useState } from 'react'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildCustomerPortalBasePath } from '@/lib/portal-links'

interface CustomerPortalLinkProps {
  customerId: string
  accessToken: string | null
}

export function CustomerPortalLink({ customerId, accessToken }: CustomerPortalLinkProps) {
  const [copied, setCopied] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [token, setToken] = useState(accessToken)
  const [error, setError] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const portalPath = buildCustomerPortalBasePath(token)
  const portalUrl = portalPath ? `${appUrl}${portalPath}` : null

  const copyLink = async () => {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regenerateToken = async () => {
    setIsRegenerating(true)
    setError(null)
    try {
      const response = await fetch(`/api/customers/${customerId}/regenerate-token`, {
        method: 'POST',
      })
      const payload = (await response.json().catch(() => null)) as
        | { data?: { access_token?: string | null }; error?: { message?: string } }
        | null
      if (!response.ok) {
        setError(payload?.error?.message ?? 'Failed to regenerate token')
        return
      }
      setToken(payload?.data?.access_token ?? null)
    } catch {
      setError('Failed to regenerate token')
    } finally {
      setIsRegenerating(false)
    }
  }

  if (!token) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Portal Link</h2>
        <p className="text-sm text-muted-foreground">No portal token generated yet.</p>
        <Button size="sm" variant="outline" onClick={regenerateToken} disabled={isRegenerating}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {isRegenerating ? 'Generating...' : 'Generate Token'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Portal Link</h2>
      <p className="text-xs text-muted-foreground">
        Share this permanent link with the customer. They can create orders and view history without logging in.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-xs">
          {portalUrl}
        </code>
        <Button size="sm" variant="outline" onClick={copyLink}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={regenerateToken} disabled={isRegenerating}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        {isRegenerating ? 'Regenerating...' : 'Regenerate Token'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  )
}
