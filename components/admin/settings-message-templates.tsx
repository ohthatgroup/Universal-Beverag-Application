'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const KIND_LABELS: Record<string, { label: string; vars: string }> = {
  'stale-customers': {
    label: 'Stale customer outreach',
    vars: '{{businessName}} · {{days}}',
  },
  'stale-drafts-nudge': {
    label: 'Stale draft nudge',
    vars: '{{businessName}} · {{deliveryDate}} · {{days}}',
  },
  'first-order-welcome': {
    label: 'First-order welcome',
    vars: '{{businessName}}',
  },
  'customer-anniversary': {
    label: 'Customer anniversary',
    vars: '{{businessName}}',
  },
  'drafts-near-delivery-nudge': {
    label: 'Drafts near delivery nudge',
    vars: '{{businessName}} · {{deliveryDate}}',
  },
}

interface ApiResponse {
  data?: { templates?: Record<string, string> }
}

/**
 * Per-kind template editor. Lives inside the Settings hub. Loads
 * resolved templates (default-or-override) from
 * `/api/admin/message-templates`; saves overrides via PUT
 * `/api/admin/message-templates/<kind>`.
 */
export function SettingsMessageTemplates() {
  const [templates, setTemplates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKind, setSavingKind] = useState<string | null>(null)
  const [savedKind, setSavedKind] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/message-templates')
      .then((r) => r.json() as Promise<ApiResponse>)
      .then((payload) => {
        if (cancelled) return
        setTemplates(payload.data?.templates ?? {})
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Could not load templates.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async (kind: string) => {
    setSavingKind(kind)
    setError(null)
    try {
      const res = await fetch(`/api/admin/message-templates/${kind}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: templates[kind] ?? '' }),
      })
      if (!res.ok) throw new Error('Failed to save template')
      setSavedKind(kind)
      setTimeout(() => setSavedKind(null), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSavingKind(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card px-4 py-6 text-sm text-muted-foreground">
        Loading templates…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <ul className="space-y-3">
        {Object.entries(KIND_LABELS).map(([kind, meta]) => (
          <li key={kind} className="rounded-xl border bg-card p-3">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor={`template-${kind}`} className="text-sm font-medium">
                {meta.label}
              </Label>
              <span className="text-[11px] text-muted-foreground/80">
                vars: {meta.vars}
              </span>
            </div>
            <textarea
              id={`template-${kind}`}
              value={templates[kind] ?? ''}
              onChange={(e) =>
                setTemplates((prev) => ({ ...prev, [kind]: e.target.value }))
              }
              rows={3}
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              {savedKind === kind && (
                <span
                  className={cn(
                    'rounded-full border border-emerald-500/40 bg-emerald-500/10',
                    'px-2 py-0.5 text-[11px] font-medium text-emerald-700',
                  )}
                >
                  Saved
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => save(kind)}
                disabled={savingKind === kind}
              >
                {savingKind === kind ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
