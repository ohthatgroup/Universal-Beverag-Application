import { buildAbsoluteUrl, buildAuthCallbackUrl } from '@/lib/config/public-url'
import { RouteError } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export interface OrderLinkPayload {
  orderId: string
  customerId: string
  customerEmail: string
  orderDeepLink: string
  magicLink: string
}

interface GenerateOrderLinkInput {
  orderId: string
  customerId: string
  customerEmail: string | null
}

export async function generateOrderMagicLink(input: GenerateOrderLinkInput): Promise<OrderLinkPayload> {
  if (!input.customerEmail) {
    throw new RouteError(
      400,
      'customer_email_missing',
      'Customer does not have an email address configured'
    )
  }

  const orderPath = `/order/link/${input.orderId}`
  const orderDeepLink = buildAbsoluteUrl(orderPath)
  const redirectTo = buildAuthCallbackUrl(orderPath)

  const adminClient = createAdminClient()
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: input.customerEmail,
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

  return {
    orderId: input.orderId,
    customerId: input.customerId,
    customerEmail: input.customerEmail,
    orderDeepLink,
    magicLink,
  }
}
