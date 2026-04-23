'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AccountSettingsFormProps {
  initialOfficeEmail: string | null
}

export function AccountSettingsForm({ initialOfficeEmail }: AccountSettingsFormProps) {
  const [officeEmail, setOfficeEmail] = useState(initialOfficeEmail ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const trimmed = officeEmail.trim()
      const response = await fetch('/api/admin/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ office_email: trimmed === '' ? null : trimmed }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? 'Failed to save')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold">Office</h2>
        <div className="mt-4 space-y-2">
          <label htmlFor="office-email" className="block text-sm font-medium">
            Office email
          </label>
          <Input
            id="office-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="orders@yourcompany.com"
            value={officeEmail}
            onChange={(e) => setOfficeEmail(e.target.value)}
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            Submitted orders can be forwarded to this inbox in plaintext from the
            &ldquo;Share &rarr; Email to office&rdquo; menu on each order.
          </p>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
