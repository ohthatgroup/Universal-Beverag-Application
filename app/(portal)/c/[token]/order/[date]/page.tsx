import { notFound, redirect } from 'next/navigation'
import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export default async function PortalOrderDateRedirectPage({
  params,
}: {
  params: Promise<{ token: string; date: string }>
}) {
  const { token, date } = await params

  if (!isoDateRegex.test(date)) {
    notFound()
  }

  const { customerId } = await resolveCustomerToken(token)
  const admin = createAdminClient()

  // Check for existing draft
  const { data: existingOrder, error: existingError } = await admin
    .from('orders')
    .select('id')
    .eq('customer_id', customerId)
    .eq('delivery_date', date)
    .eq('status', 'draft')
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existingOrder?.id) {
    redirect(`/c/${token}/order/link/${existingOrder.id}`)
  }

  // Create new draft
  const { data: createdOrder, error: createError } = await admin
    .from('orders')
    .insert({
      customer_id: customerId,
      delivery_date: date,
      status: 'draft',
    })
    .select('id')
    .single()

  if (createError || !createdOrder) {
    // Race condition: another request created the draft
    if (createError?.code === '23505') {
      const { data: raceOrder, error: raceError } = await admin
        .from('orders')
        .select('id')
        .eq('customer_id', customerId)
        .eq('delivery_date', date)
        .eq('status', 'draft')
        .maybeSingle()

      if (raceError) {
        throw raceError
      }

      if (raceOrder?.id) {
        redirect(`/c/${token}/order/link/${raceOrder.id}`)
      }
    }

    throw createError ?? new Error('Unable to load or create draft order')
  }

  redirect(`/c/${token}/order/link/${createdOrder.id}`)
}
