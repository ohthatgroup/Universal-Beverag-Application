import { z } from 'zod'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { provisionCustomerProfile } from '@/lib/server/customer-provisioning'

const createCustomerSchema = z.object({
  businessName: z.string().trim().min(1),
  email: z.string().trim().email(),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  try {
    const context = await requireAuthContext(['salesman'])
    const payload = await parseBody(request, createCustomerSchema)
    const data = await provisionCustomerProfile({
      businessName: payload.businessName,
      email: payload.email,
    })

    logApiEvent(requestId, 'customer_created', {
      createdBy: context.userId,
      customerId: data.id,
      authUserId: data.auth_user_id,
    })

    return apiOk(data, 201, requestId)
  } catch (error) {
    logApiEvent(requestId, 'customer_create_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
