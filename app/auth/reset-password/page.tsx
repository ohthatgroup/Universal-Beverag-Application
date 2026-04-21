'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import { getAuthClient } from '@/lib/auth/client'
import { toSafePasswordResetCompletionErrorMessage } from '@/lib/auth/safe-messages'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/20 p-4 sm:p-8">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const isCodeFlow = Boolean(code)
  const hasResetCredential = isCodeFlow || Boolean(token)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPreparingSession, setIsPreparingSession] = useState(isCodeFlow)
  const [isCodeSessionReady, setIsCodeSessionReady] = useState(!isCodeFlow)
  const [authClient, setAuthClient] = useState<ReturnType<typeof getAuthClient> | null>(null)

  useEffect(() => {
    setAuthClient(getAuthClient())
  }, [])

  useEffect(() => {
    if (!hasResetCredential) {
      router.replace('/')
    }
  }, [hasResetCredential, router])

  const betterAuthClient = authClient?.getBetterAuthInstance() ?? null

  useEffect(() => {
    if (!authClient || !code) {
      setIsPreparingSession(false)
      setIsCodeSessionReady(!isCodeFlow)
      return
    }

    let isCancelled = false

    const exchangeCode = async () => {
      setIsCodeSessionReady(false)
      const { error } = await authClient.exchangeCodeForSession(code)
      if (isCancelled) {
        return
      }

      if (error) {
        setMessage(toSafePasswordResetCompletionErrorMessage(error))
      } else {
        setIsCodeSessionReady(true)
      }
      setIsPreparingSession(false)
    }

    void exchangeCode()

    return () => {
      isCancelled = true
    }
  }, [authClient, code, isCodeFlow])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    if (!hasResetCredential) {
      setMessage('This password reset link is invalid or expired. Request a new reset email and try again.')
      return
    }

    if (!betterAuthClient) {
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

    let error: { message?: string } | null = null

    try {
      if (isCodeFlow) {
        if (!isCodeSessionReady) {
          setMessage('This password reset link is invalid or expired. Request a new reset email and try again.')
          setIsLoading(false)
          return
        }

        const result = await betterAuthClient.resetPassword({
          newPassword: password,
        })
        error = result?.error ?? null
      } else if (token) {
        const result = await betterAuthClient.resetPassword({
          newPassword: password,
          token,
        })
        error = result?.error ?? null
      }
    } catch (caughtError) {
      error = {
        message: caughtError instanceof Error ? caughtError.message : 'Unable to reset password.',
      }
    }

    setIsLoading(false)

    if (error) {
      setMessage(toSafePasswordResetCompletionErrorMessage(error))
      return
    }

    router.push('/auth/reset-success')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Universal Beverages</h1>

        {!hasResetCredential && (
          <Card>
            <CardHeader>
              <CardTitle>Redirecting...</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This password reset page only works from the email link. Redirecting to the admin sign-in screen.
            </CardContent>
          </Card>
        )}

        {message && (
          <div className="rounded-md border border-amber-500/30 bg-amber-100/60 p-3 text-sm text-amber-900">
            {message}
          </div>
        )}

        {hasResetCredential && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Password Reset</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                <Button
                  disabled={!betterAuthClient || isLoading || isPreparingSession || (isCodeFlow && !isCodeSessionReady)}
                  type="submit"
                  className="w-full"
                >
                  {isPreparingSession
                    ? 'Preparing...'
                    : isLoading
                      ? 'Resetting...'
                      : 'Reset Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
