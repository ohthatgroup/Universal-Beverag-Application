import { redirect } from 'next/navigation'

interface AdminOrdersPageProps {
  searchParams?: Promise<{
    q?: string
    status?: string
    deliveryDate?: string
  }>
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const resolved = searchParams ? await searchParams : undefined

  const params = new URLSearchParams()
  if (resolved?.q) params.set('q', resolved.q)
  if (resolved?.status) params.set('status', resolved.status)
  if (resolved?.deliveryDate) params.set('deliveryDate', resolved.deliveryDate)

  const qs = params.toString()
  redirect(qs ? `/admin/dashboard?${qs}` : '/admin/dashboard')
}
