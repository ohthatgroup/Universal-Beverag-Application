import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function CustomersPage() {
  const context = await requirePageAuth(['salesman'])

  const { data: customers, error } = await context.supabase
    .from('profiles')
    .select('id,business_name,contact_name,email,phone,show_prices,custom_pricing,default_group')
    .eq('role', 'customer')
    .order('business_name', { ascending: true })

  if (error) {
    throw error
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Customers</h1>

      <div className="space-y-3">
        {(customers ?? []).map((customer) => (
          <Card key={customer.id}>
            <CardContent className="space-y-2 pt-4 text-sm">
              <div className="font-medium">{customer.business_name || customer.contact_name || customer.id}</div>
              <div className="text-xs text-muted-foreground">{customer.email ?? 'No email'}</div>
              <div className="text-xs text-muted-foreground">{customer.phone ?? 'No phone'}</div>
              <div className="text-xs text-muted-foreground">
                show_prices={String(customer.show_prices)} • custom_pricing={String(customer.custom_pricing)} •
                default_group={customer.default_group}
              </div>
              <div className="flex gap-3">
                <Link className="text-xs underline" href={`/admin/customers/${customer.id}`}>
                  Details
                </Link>
                <Link className="text-xs underline" href={`/admin/customers/${customer.id}/products`}>
                  Products
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {(customers ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No customers available.</p>
        )}
      </div>
    </div>
  )
}
