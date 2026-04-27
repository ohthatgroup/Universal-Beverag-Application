import { CustomerWorkbench } from '@/components/admin/customer-workbench'
import { requirePageAuth } from '@/lib/server/page-auth'

export const dynamic = 'force-dynamic'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePageAuth(['salesman'])
  const { id } = await params

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-28 pt-2 md:pb-6">
      <CustomerWorkbench customerId={id} />
    </div>
  )
}
