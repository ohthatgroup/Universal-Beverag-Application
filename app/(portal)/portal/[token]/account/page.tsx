import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { AccountForm } from '@/components/portal/account-form'
import { PortalPageHeader } from '@/components/portal/portal-page-header'

export default async function PortalAccountPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { profile } = await resolveCustomerToken(token)

  return (
    <div className="space-y-6">
      <PortalPageHeader back={{ href: `/portal/${token}` }} title="Account" />
      <AccountForm token={token} profile={profile} />
    </div>
  )
}
