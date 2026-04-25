import type { Viewport } from 'next'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { PortalTopBar } from '@/components/layout/portal-top-bar'

// Lock zoom on the customer portal. Two reasons:
//   1. Prevents iOS Safari from auto-zooming when an input <16px gains
//      focus and refusing to zoom back out when the keyboard dismisses.
//   2. The portal's tap targets are already comfortably sized (Stepper
//      is h-8 minimum); customers don't need to pinch-zoom an order.
// Admin pages inherit the root viewport and keep pinch-zoom.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // resolveCustomerToken still runs as the 404 gate for invalid tokens.
  await resolveCustomerToken(token)

  return (
    <div className="min-h-screen bg-background">
      <PortalTopBar token={token} />
      <main>
        <div className="mx-auto max-w-3xl p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
