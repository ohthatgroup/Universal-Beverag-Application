'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { getAuthClient } from '@/lib/auth/client'
import { toSafeInviteSetupErrorMessage, toSafeLoginErrorMessage } from '@/lib/auth/safe-messages'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InviteSetupFormProps {
  token: string
  email: string
  contactName?: string | null
}

export function InviteSetupForm({ token, email, contactName }: InviteSetupFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [authClient, setAuthClient] = useState<ReturnType<typeof getAuthClient> | null>(null)

  useEffect(() => {
    setAuthClient(getAuthClient())
  }, [])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    if (!authClient) {
      setMessage('Authentication is still loading. Please try again.')
      return
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setIsLoading(true)

    const response = await fetch('/api/auth/invite-setup', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password,
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { data?: { email?: string }; error?: { code?: string; message?: string } }
      | null

    if (!response.ok) {
      setIsLoading(false)
      setMessage(toSafeInviteSetupErrorMessage(payload?.error))
      return
    }

    const inviteEmail = payload?.data?.email ?? email
    const { error } = await authClient.signInWithPassword({
      email: inviteEmail,
      password,
    })

    setIsLoading(false)

    if (error) {
      setMessage(
        `${toSafeLoginErrorMessage(error)} Your password was created successfully. Use the normal admin sign-in screen if automatic sign-in does not finish.`
      )
      return
    }

    router.push('/auth/post-login')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Admin Password</CardTitle>
        <CardDescription>
          {contactName?.trim()
            ? `Finish setting up ${contactName.trim()}'s admin access.`
            : 'Finish setting up your admin access.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-100/60 p-3 text-sm text-amber-900">
            {message}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" readOnly value={email} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-password">Create Password</Label>
            <Input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-password-confirm">Confirm Password</Label>
            <Input
              id="invite-password-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!authClient || isLoading}>
            {isLoading ? 'Setting up...' : 'Create Password'}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have a password?{' '}
          <Link href="/auth/login" className="underline hover:text-foreground">
            Back to Admin Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
