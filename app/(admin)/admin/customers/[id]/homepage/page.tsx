import Link from 'next/link'
import { CustomerHomepageManager } from '@/components/admin/customer-homepage-manager'
import { PageHeader } from '@/components/ui/page-header'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function CustomerHomepagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePageAuth(['salesman'])
  const { id } = await params

  // TODO: fetch real customer profile (see docs/handoff/homepage-redesign.md)
  const customerName = 'Acme Deli'

  return (
    <div className="space-y-2">
      <PageHeader
        title="Homepage"
        description={`Per-customer overrides for ${customerName}.`}
        breadcrumb={
          <div className="flex items-center gap-2">
            <Link href="/admin/customers" className="hover:underline">
              Customers
            </Link>
            <span>/</span>
            <Link
              href={`/admin/customers/${id}`}
              className="hover:underline"
            >
              {customerName}
            </Link>
            <span>/</span>
            <span className="font-medium text-foreground">Homepage</span>
          </div>
        }
      />
      <CustomerHomepageManager customerId={id} customerName={customerName} />
    </div>
  )
}
