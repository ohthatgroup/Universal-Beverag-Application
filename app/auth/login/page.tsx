'use client'

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
  const [message, setMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const onSalesmanLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)
    setSuccessMessage(null)

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

  const onForgotPassword = async () => {
    if (!email) {
      setMessage('Enter your email address first, then click Forgot password.')
      return
    }
    setIsResetting(true)
    setMessage(null)
    setSuccessMessage(null)

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo }
    )

    setIsResetting(false)

    if (resetError) {
      setMessage(resetError.message)
      return
    }

    setSuccessMessage('Check your email for a password reset link.')
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Universal Beverages</h1>

        {(error || message) && (
          <div className="rounded-md border border-amber-500/30 bg-amber-100/60 p-3 text-sm text-amber-900">
            {error === 'auth_callback_failed'
              ? 'The authentication callback failed. Please try again.'
              : error === 'profile_missing'
                ? 'You are signed in but do not have a profile yet. Contact your admin.'
                : message}
          </div>
        )}

        {successMessage && (
          <div className="rounded-md border border-green-500/30 bg-green-100/60 p-3 text-sm text-green-900">
            {successMessage}
          </div>
        )}

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

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={isResetting}
                className="text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50"
              >
                {isResetting ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
