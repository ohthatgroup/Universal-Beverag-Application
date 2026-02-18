import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiOk, getRequestId, logApiEvent, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext, RouteError } from '@/lib/server/auth'
import { isoDateSchema } from '@/lib/server/schemas'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const createMagicLinkSchema = z.object({
  deliveryDate: isoDateSchema,
})

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const { id } = paramsSchema.parse(await routeContext.params)
    const payload = await parseBody(request, createMagicLinkSchema)

    const adminClient = createAdminClient()
    const { data: customer, error: customerError } = await adminClient
      .from('profiles')
      .select('id,role,email')
      .eq('id', id)
      .eq('role', 'customer')
      .maybeSingle()

    if (customerError) {
      throw customerError
    }

    if (!customer) {
      throw new RouteError(404, 'customer_not_found', 'Customer not found')
    }

    if (!customer.email) {
      throw new RouteError(
        400,
        'customer_email_missing',
        'Customer does not have an email address configured'
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
    const baseUrl = appUrl.replace(/\/$/, '')
    const nextPath = `/order/${payload.deliveryDate}`
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: customer.email,
      options: {
        redirectTo,
      },
    })

    if (linkError) {
      throw linkError
    }

    const magicLink = linkData?.properties?.action_link
    if (!magicLink) {
      throw new Error('Failed to generate action link')
    }

    logApiEvent(requestId, 'customer_magic_link_generated', {
      customerId: customer.id,
      customerEmail: customer.email,
      deliveryDate: payload.deliveryDate,
    })

    return apiOk(
      {
        customerId: customer.id,
        customerEmail: customer.email,
        deliveryDate: payload.deliveryDate,
        magicLink,
      },
      200,
      requestId
    )
  } catch (error) {
    logApiEvent(requestId, 'customer_magic_link_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
