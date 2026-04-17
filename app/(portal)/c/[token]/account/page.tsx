import { redirect } from 'next/navigation'
import { buildCustomerPortalBasePath } from '@/lib/portal-links'

export default async function PortalAccountPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  redirect(`${buildCustomerPortalBasePath(token) ?? '/portal'}/account`)
}
