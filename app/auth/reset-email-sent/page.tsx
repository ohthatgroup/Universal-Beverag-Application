import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OutcomeScreen } from '@/components/ui/outcome-screen'

export default async function ResetEmailSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <div className="min-h-screen bg-muted/20">
      <OutcomeScreen
        icon={Mail}
        tone="neutral"
        title="Check your email"
        description={
          <>
            If <strong>{email ?? 'that email address'}</strong> is an admin account, a password
            setup or reset email has been sent. Use the link in that email to set a new password.
          </>
        }
        primary={
          <Button asChild>
            <Link href="/auth/login">Back to Admin Sign In</Link>
          </Button>
        }
      />
    </div>
  )
}
