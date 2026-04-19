import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { PortalTopBar } from '@/components/layout/portal-top-bar'

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { profile } = await resolveCustomerToken(token)
  const customerName =
    profile.business_name?.trim() || profile.contact_name?.trim() || 'Account'

  return (
    <div className="min-h-screen bg-background">
      <PortalTopBar token={token} customerName={customerName} />
      <main>
        <div className="mx-auto max-w-3xl p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
