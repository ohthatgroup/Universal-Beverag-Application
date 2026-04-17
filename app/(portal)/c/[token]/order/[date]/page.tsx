import { redirect } from 'next/navigation'
import { buildCustomerPortalOrderDatePath } from '@/lib/portal-links'

export default async function PortalOrderDateRedirectPage({
  params,
}: {
  params: Promise<{ token: string; date: string }>
}) {
  const { token, date } = await params
  redirect(buildCustomerPortalOrderDatePath(token, date) ?? '/portal')
}
