import { redirect } from 'next/navigation'

export default async function PortalOrdersRedirect({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  redirect(`/c/${token}`)
}
