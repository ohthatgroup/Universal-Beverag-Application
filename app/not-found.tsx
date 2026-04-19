import Link from 'next/link'
import { LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OutcomeScreen } from '@/components/ui/outcome-screen'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <OutcomeScreen
        icon={LinkIcon}
        tone="warning"
        title="This link isn't active"
        description="The link you used may have expired or been replaced. Please ask your sales contact for an updated link."
        primary={
          <Button asChild variant="default">
            <a href="mailto:contact@universalbeverages.com">Contact sales</a>
          </Button>
        }
        secondary={
          <Button asChild variant="outline">
            <Link href="/auth/login">Admin sign in</Link>
          </Button>
        }
      />
    </div>
  )
}
