import { randomBytes, randomUUID } from 'crypto'
import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'

const createCustomerSchema = z.object({
  businessName: z.string().trim().min(1),
  email: z.string().trim().email().nullable().optional(),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  try {
    const context = await requireAuthContext(['salesman'])
    const payload = await parseBody(request, createCustomerSchema)
    const customerId = randomUUID()
    const accessToken = randomBytes(16).toString('hex')

    const { data, error } = await context.supabase
      .from('profiles')
      .insert({
        id: customerId,
        role: 'customer',
        business_name: payload.businessName,
        email: payload.email ?? null,
        contact_name: null,
        phone: null,
        show_prices: true,
        custom_pricing: false,
        default_group: 'brand',
        access_token: accessToken,
      })
      .select('id,business_name,email,access_token')
      .single()

    if (error) {
      throw error
    }

    logApiEvent(requestId, 'customer_created', {
      createdBy: context.userId,
      customerId: data.id,
    })

    return apiOk(data, 201, requestId)
  } catch (error) {
    logApiEvent(requestId, 'customer_create_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
