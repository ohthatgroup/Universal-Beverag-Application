import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OutcomeScreen } from '@/components/ui/outcome-screen'

export const dynamic = 'force-static'

export default function ResetSuccessPage() {
  return (
    <div className="min-h-screen bg-muted/20">
      <OutcomeScreen
        icon={CheckCircle}
        tone="success"
        title="Password updated"
        description="Your admin password has been reset successfully. Return to the sign-in page and continue into the dashboard with your new password."
        primary={
          <Button asChild>
            <Link href="/auth/login">Back to Admin Sign In</Link>
          </Button>
        }
      />
    </div>
  )
}
