'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/20 p-4 sm:p-8">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/admin/dashboard'
  const error = searchParams.get('error')

  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const callbackUrl =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}/auth/callback?next=/`

  const onSalesmanLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsLoading(false)

    if (signInError) {
      setMessage(signInError.message)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  const onCustomerMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: customerEmail,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    setIsLoading(false)

    if (otpError) {
      setMessage(otpError.message)
      return
    }

    setMessage('Magic link sent. Check your email inbox.')
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-semibold">Universal Beverages</h1>

        {(error || message) && (
          <div className="rounded-md border border-amber-500/30 bg-amber-100/60 p-3 text-sm text-amber-900">
            {error === 'callback_failed'
              ? 'The authentication callback failed. Please try again.'
              : error === 'profile_missing'
                ? 'You are signed in but do not have a profile yet. Contact your admin.'
                : message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Salesman Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSalesmanLogin}>
                <div className="space-y-2">
                  <Label htmlFor="salesman-email">Email</Label>
                  <Input
                    id="salesman-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesman-password">Password</Label>
                  <Input
                    id="salesman-password"
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <Button disabled={isLoading} type="submit" className="w-full">
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Magic Link</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onCustomerMagicLink}>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                  />
                </div>

                <Button disabled={isLoading} type="submit" variant="secondary" className="w-full">
                  {isLoading ? 'Sending...' : 'Send magic link'}
                </Button>
              </form>

              <p className="mt-4 text-sm text-muted-foreground">
                Prefer a dedicated magic-link page?{' '}
                <Link className="underline" href="/auth/magic">
                  Open /auth/magic
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
