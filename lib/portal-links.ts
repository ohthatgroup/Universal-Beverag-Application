export function buildCustomerOrderDeepLink(
  customerToken: string | null | undefined,
  orderId: string
): string | null {
  if (!customerToken) return null
  return `/c/${customerToken}/order/link/${orderId}`
}

