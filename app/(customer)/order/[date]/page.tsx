import { notFound, redirect } from 'next/navigation'
import { requirePageAuth } from '@/lib/server/page-auth'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export default async function OrderDateRedirectPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params

  if (!isoDateRegex.test(date)) {
    notFound()
  }

  const context = await requirePageAuth(['customer'])

  const { data: existingOrder, error: existingError } = await context.supabase
    .from('orders')
    .select('id')
    .eq('customer_id', context.userId)
    .eq('delivery_date', date)
    .eq('status', 'draft')
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existingOrder?.id) {
    redirect(`/order/link/${existingOrder.id}`)
  }

  const { data: createdOrder, error: createError } = await context.supabase
    .from('orders')
    .insert({
      customer_id: context.userId,
      delivery_date: date,
      status: 'draft',
    })
    .select('id')
    .single()

  if (createError || !createdOrder) {
    if (createError?.code === '23505') {
      const { data: raceOrder, error: raceError } = await context.supabase
        .from('orders')
        .select('id')
        .eq('customer_id', context.userId)
        .eq('delivery_date', date)
        .eq('status', 'draft')
        .maybeSingle()

      if (raceError) {
        throw raceError
      }

      if (raceOrder?.id) {
        redirect(`/order/link/${raceOrder.id}`)
      }
    }

    throw createError ?? new Error('Unable to load or create draft order')
  }

  redirect(`/order/link/${createdOrder.id}`)
}
