'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function MagicLinkPage() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const callbackUrl =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}/auth/callback?next=/`

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    setIsSubmitting(false)

    if (error) {
      setStatus(error.message)
      return
    }

    setStatus('Magic link sent. Open the email on this device to sign in.')
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Customer Magic Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="customer@example.com"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send magic link'}
              </Button>
            </form>

            {status && (
              <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
                {status}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Need salesperson login?{' '}
              <Link className="underline" href="/auth/login">
                Go to /auth/login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
