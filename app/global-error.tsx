'use client'

import { Button } from '@/components/ui/button'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-3 rounded-md border p-6 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">An unexpected error occurred. Please retry.</p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  )
}
