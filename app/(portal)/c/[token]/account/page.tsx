import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { AccountForm } from '@/components/portal/account-form'

export default async function PortalAccountPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { profile } = await resolveCustomerToken(token)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <AccountForm token={token} profile={profile} />
    </div>
  )
}
