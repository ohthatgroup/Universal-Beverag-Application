import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-static'

export default async function ResetEmailSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Universal Beverages</h1>

        <Card>
          <CardHeader>
            <CardTitle>Check Your Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              If <span className="font-medium text-foreground">{email ?? 'that email address'}</span> is an
              admin account, a password setup or reset email has been sent.
            </p>
            <p>
              Use the link in that email to open the admin reset page and finish setting a new password.
            </p>
            <div className="flex gap-3 pt-2">
              <Button asChild>
                <Link href="/auth/login">Back to Admin Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
