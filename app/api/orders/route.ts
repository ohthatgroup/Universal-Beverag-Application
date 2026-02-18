import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { createOrGetDraftSchema, isoDateSchema, orderStatusSchema } from '@/lib/server/schemas'

const listQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  deliveryDate: isoDateSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  customerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export async function GET(request: Request) {
  const requestId = getRequestId(request)
  try {
    const context = await requireAuthContext()
    const params = Object.fromEntries(new URL(request.url).searchParams.entries())
    const query = listQuerySchema.parse(params)

    logApiEvent(requestId, 'orders_list_requested', {
      userId: context.userId,
      role: context.profile.role,
    })

    let dbQuery = context.supabase
      .from('orders')
      .select('*')
      .order('delivery_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(query.limit)

    if (context.profile.role === 'customer') {
      dbQuery = dbQuery.eq('customer_id', context.userId)
    } else if (query.customerId) {
      dbQuery = dbQuery.eq('customer_id', query.customerId)
    }

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }

    if (query.deliveryDate) {
      dbQuery = dbQuery.eq('delivery_date', query.deliveryDate)
    }

    if (query.from) {
      dbQuery = dbQuery.gte('delivery_date', query.from)
    }

    if (query.to) {
      dbQuery = dbQuery.lte('delivery_date', query.to)
    }

    const { data, error } = await dbQuery

    if (error) {
      throw error
    }

    return apiOk(data ?? [], 200, requestId)
  } catch (error) {
    logApiEvent(requestId, 'orders_list_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    const context = await requireAuthContext()
    const payload = await parseBody(request, createOrGetDraftSchema)

    const customerId =
      context.profile.role === 'customer' ? context.userId : payload.customerId

    if (!customerId) {
      throw new RouteError(
        400,
        'validation_error',
        'Salesman must include customerId when creating customer drafts'
      )
    }

    const { data: existingOrder, error: existingError } = await context.supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .eq('delivery_date', payload.deliveryDate)
      .eq('status', 'draft')
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existingOrder) {
      return apiOk({ order: existingOrder, created: false }, 200, requestId)
    }

    const { data: order, error: insertError } = await context.supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        delivery_date: payload.deliveryDate,
        status: 'draft',
      })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: raceOrder } = await context.supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customerId)
          .eq('delivery_date', payload.deliveryDate)
          .eq('status', 'draft')
          .maybeSingle()

        if (raceOrder) {
          return apiOk({ order: raceOrder, created: false }, 200, requestId)
        }
      }
      throw insertError
    }

    return apiOk({ order, created: true }, 201, requestId)
  } catch (error) {
    logApiEvent(requestId, 'order_create_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
