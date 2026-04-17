import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { triggerStaffInvitePasswordSetup } from '@/lib/server/staff-invites'

export const dynamic = 'force-dynamic'

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token?.trim()) {
    return <InviteState title="Invite Link Invalid" message="This admin invite link is missing required information." />
  }

  const result = await triggerStaffInvitePasswordSetup(token).catch((error) => ({
    status: 'error' as const,
    message: error instanceof Error ? error.message : 'Unable to process this invite.',
  }))

  if (result.status === 'pending') {
    redirect(`/auth/reset-password?email=${encodeURIComponent(result.invite.email)}`)
  }

  if (result.status === 'accepted') {
    return (
      <InviteState
        title="Invite Already Used"
        message="This admin invite has already been accepted. Use the normal admin sign-in screen or reset your password if needed."
      />
    )
  }

  if (result.status === 'revoked') {
    return (
      <InviteState
        title="Invite Revoked"
        message="This admin invite is no longer active. Ask an existing salesman to send you a new invite."
      />
    )
  }

  if (result.status === 'disabled') {
    return (
      <InviteState
        title="Account Disabled"
        message="This admin account is currently disabled. Contact another salesman if you need access restored."
      />
    )
  }

  return (
    <InviteState
      title="Invite Link Invalid"
      message={result.status === 'error' ? result.message : 'This admin invite link is invalid or has expired.'}
    />
  )
}

function InviteState({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Universal Beverages</h1>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{message}</p>
            <Button asChild>
              <Link href="/auth/login">Back to Admin Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
