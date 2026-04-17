import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-static'

export default function ResetSuccessPage() {
  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Universal Beverages</h1>

        <Card>
          <CardHeader>
            <CardTitle>Password Updated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Your admin password has been reset successfully.</p>
            <p>Return to the sign-in page and continue into the dashboard with the new password.</p>
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
