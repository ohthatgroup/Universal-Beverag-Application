import { redirect } from 'next/navigation'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'

export default async function PortalOrderLinkPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>
}) {
  const { token, id } = await params
  redirect(buildCustomerOrderDeepLink(token, id) ?? '/portal')
}
