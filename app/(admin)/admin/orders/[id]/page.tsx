import { OrderWorkbench } from '@/components/admin/order-workbench'
import { requirePageAuth } from '@/lib/server/page-auth'

export const dynamic = 'force-dynamic'

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ returnTo?: string }>
}) {
  await requirePageAuth(['salesman'])
  const { id } = await params
  const resolved = searchParams ? await searchParams : undefined

  return <OrderWorkbench orderId={id} returnTo={resolved?.returnTo} />
}
