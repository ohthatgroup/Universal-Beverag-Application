'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import { getAuthClient } from '@/lib/auth/client'
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
  const authClient = getAuthClient()
  const betterAuthClient = authClient.getBetterAuthInstance()
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const email = searchParams.get('email')?.trim().toLowerCase() ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPreparingSession, setIsPreparingSession] = useState(Boolean(code))

  useEffect(() => {
    if (!code) {
      setIsPreparingSession(false)
      return
    }

    let isCancelled = false

    const exchangeCode = async () => {
      const { error } = await authClient.exchangeCodeForSession(code)
      if (isCancelled) {
        return
      }

      if (error) {
        setMessage(error.message)
      }
      setIsPreparingSession(false)
    }

    void exchangeCode()

    return () => {
      isCancelled = true
    }
  }, [authClient, code])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

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
      if (token) {
        const result = await betterAuthClient.resetPassword({
          newPassword: password,
          token,
        })
        error = result?.error ?? null
      } else {
        if (!email) {
          setMessage('Missing email address for password reset.')
          setIsLoading(false)
          return
        }

        if (!otp.trim()) {
          setMessage('Enter the code from your email.')
          setIsLoading(false)
          return
        }

        const result = await betterAuthClient.emailOtp.resetPassword({
          email,
          otp: otp.trim(),
          password,
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
      setMessage(error.message ?? 'Unable to reset password.')
      return
    }

    router.push('/auth/reset-success')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Universal Beverages</h1>

        {message && (
          <div className="rounded-md border border-amber-500/30 bg-amber-100/60 p-3 text-sm text-amber-900">
            {message}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Admin Password Reset</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {!code && !token && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input id="reset-email" type="email" required value={email} readOnly />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reset-otp">One-Time Code</Label>
                    <Input
                      id="reset-otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter the code from your email"
                      required
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
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
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>

              <Button disabled={isLoading || isPreparingSession} type="submit" className="w-full">
                {isPreparingSession
                  ? 'Preparing...'
                  : isLoading
                    ? 'Resetting...'
                    : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
