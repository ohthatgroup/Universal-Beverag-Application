'use client'

import { useState } from 'react'
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

  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFeedback(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFeedback(null)

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
        setFeedback({ type: 'error', message })
        return
      }

      setFeedback({ type: 'success', message: 'Changes saved' })
    } catch {
      setFeedback({ type: 'error', message: 'Network error — please try again' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Name — read only */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground">Business Name</Label>
        <p className="text-sm font-medium">{profile.business_name ?? '—'}</p>
      </div>

      {/* Contact Info */}
      <fieldset className="space-y-4 rounded-lg border p-4">
        <legend className="px-2 text-sm font-medium">Contact</legend>

        <div className="space-y-1.5">
          <Label htmlFor="contact_name">Contact Name</Label>
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
      </fieldset>

      {/* Address */}
      <fieldset className="space-y-4 rounded-lg border p-4">
        <legend className="px-2 text-sm font-medium">Address</legend>

        <div className="space-y-1.5">
          <Label htmlFor="address">Street Address</Label>
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
      </fieldset>

      {/* Feedback + Submit */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        {feedback && (
          <p
            className={
              feedback.type === 'success'
                ? 'text-sm text-green-600'
                : 'text-sm text-destructive'
            }
          >
            {feedback.message}
          </p>
        )}
      </div>
    </form>
  )
}
