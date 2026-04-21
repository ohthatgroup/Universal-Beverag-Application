import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">This link isn&apos;t active</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The link you used may have expired or been replaced. Please ask your sales contact for an updated link.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          href="mailto:contact@universalbeverages.com"
        >
          Contact sales
        </a>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium text-foreground"
          href="/auth/login"
        >
          Admin sign in
        </Link>
      </div>
    </main>
  )
}
