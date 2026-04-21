'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Profile } from '@/lib/types'

interface AccountFormProps {
  token: string
  profile: Profile
}

export function AccountForm({ token, profile }: AccountFormProps) {
  const [formData, setFormData] = useState({
    contact_name: profile.contact_name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    zip: profile.zip ?? '',
  })

  type SaveState =
    | { kind: 'idle' }
    | { kind: 'saving' }
    | { kind: 'saved' }
    | { kind: 'error'; message: string }

  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' })
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (saveState.kind === 'saved' || saveState.kind === 'error') {
      setSaveState({ kind: 'idle' })
    }
  }

  const submit = async () => {
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current)
      savedTimerRef.current = null
    }
    setSaveState({ kind: 'saving' })

    try {
      const response = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-Token': token,
        },
        body: JSON.stringify(formData),
      })

      const payload = (await response.json().catch(() => null)) as
        | { data?: { updated: boolean } }
        | { error?: { message?: string } }
        | null

      if (!response.ok) {
        const message =
          payload && 'error' in payload
            ? payload.error?.message ?? 'Failed to save'
            : 'Failed to save'
        setSaveState({ kind: 'error', message })
        return
      }

      setSaveState({ kind: 'saved' })
      savedTimerRef.current = setTimeout(() => {
        setSaveState({ kind: 'idle' })
        savedTimerRef.current = null
      }, 1500)
    } catch {
      setSaveState({ kind: 'error', message: 'Network error — please try again' })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void submit()
  }

  const buttonLabel =
    saveState.kind === 'saving'
      ? 'Saving…'
      : saveState.kind === 'saved'
      ? 'Saved ✓'
      : 'Save changes'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24 md:pb-0">
      <div className="space-y-1.5">
        <Label className="text-muted-foreground">Business</Label>
        <p className="text-sm font-medium">{profile.business_name ?? '—'}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact_name">Contact name</Label>
        <Input
          id="contact_name"
          value={formData.contact_name}
          onChange={(e) => handleChange('contact_name', e.target.value)}
          placeholder="Full name"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Street address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="123 Main St"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="City"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder="State"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zip">ZIP</Label>
          <Input
            id="zip"
            value={formData.zip}
            onChange={(e) => handleChange('zip', e.target.value)}
            placeholder="12345"
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-2 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button type="submit" disabled={saveState.kind === 'saving'}>
            {buttonLabel}
          </Button>
          {saveState.kind === 'saved' && (
            <p className="text-sm text-muted-foreground">Changes saved</p>
          )}
          {saveState.kind === 'error' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <span>{saveState.message}</span>
              <button
                type="button"
                onClick={() => void submit()}
                className="font-medium underline-offset-4 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
