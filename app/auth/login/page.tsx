'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import { getAuthClient } from '@/lib/auth/client'
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
  const authClient = getAuthClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/admin/dashboard'
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const [salesmanEmail, setSalesmanEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isExchangingCode, setIsExchangingCode] = useState(false)

  useEffect(() => {
    if (!code || isExchangingCode) {
      return
    }

    let isCancelled = false

    const exchangeCode = async () => {
      setIsExchangingCode(true)
      setMessage(null)

      const { error: exchangeError } = await authClient.exchangeCodeForSession(code)
      if (isCancelled) {
        return
      }

      if (exchangeError) {
        setMessage(exchangeError.message)
        setIsExchangingCode(false)
        return
      }

      window.location.replace(redirect)
    }

    void exchangeCode()

    return () => {
      isCancelled = true
    }
  }, [authClient, code, isExchangingCode, redirect, router])

  const onSalesmanLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)
    setSuccessMessage(null)

    const { error: signInError } = await authClient.signInWithPassword({
      email: salesmanEmail,
      password,
    })

    setIsLoading(false)

    if (signInError) {
      setMessage(signInError.message)
      return
    }

    window.location.assign(redirect)
  }

  const onForgotPassword = async () => {
    if (!salesmanEmail) {
      setMessage('Enter your email address first, then click Forgot password.')
      return
    }

    setIsResetting(true)
    setMessage(null)
    setSuccessMessage(null)

    const response = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: salesmanEmail.trim(),
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null

    setIsResetting(false)

    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Unable to start password reset.')
      return
    }

    router.push(`/auth/reset-email-sent?email=${encodeURIComponent(salesmanEmail.trim())}`)
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
                ? 'You are signed in, but this account is not linked to an admin profile.'
                : error === 'admin_disabled'
                  ? 'This admin account is disabled. Contact another salesman if you need access restored.'
                : error === 'admin_only'
                  ? 'This sign-in page is for admin access only. Customers should use their portal access link.'
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
            <CardTitle>Admin Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSalesmanLogin}>
              <div className="space-y-2">
                <Label htmlFor="salesman-email">Email</Label>
                <Input
                  id="salesman-email"
                  type="email"
                  required
                  value={salesmanEmail}
                  onChange={(event) => setSalesmanEmail(event.target.value)}
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

              <Button disabled={isLoading || isExchangingCode} type="submit" className="w-full">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={isResetting || isExchangingCode}
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
