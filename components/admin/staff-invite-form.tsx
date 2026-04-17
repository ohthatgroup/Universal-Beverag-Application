'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function StaffInviteForm() {
  const router = useRouter()
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName,
          email,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to send invite')
      }

      setContactName('')
      setEmail('')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]">
      <div className="space-y-2">
        <Label htmlFor="staff-name">Name</Label>
        <Input
          id="staff-name"
          required
          placeholder="Sales rep name"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-email">Email</Label>
        <Input
          id="staff-email"
          type="email"
          required
          placeholder="rep@business.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={isSubmitting}>
          <Users className="h-4 w-4" />
          {isSubmitting ? 'Sending...' : 'Send Invite'}
        </Button>
      </div>

      {error ? <p className="sm:col-span-3 text-sm text-destructive">{error}</p> : null}
    </form>
  )
}
