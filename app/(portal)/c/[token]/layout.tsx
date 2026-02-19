import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { CustomerNav } from '@/components/layout/customer-nav'

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Validate the token — this will call notFound() if invalid
  await resolveCustomerToken(token)

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav token={token} />
      <main className="pb-20 md:pb-0">
        <div className="mx-auto max-w-4xl p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
