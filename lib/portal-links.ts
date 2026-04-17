export function buildCustomerPortalBasePath(customerToken: string | null | undefined): string | null {
  if (!customerToken) return null
  return `/portal/${customerToken}`
}

export function buildCustomerPortalOrderDatePath(
  customerToken: string | null | undefined,
  deliveryDate: string
): string | null {
  const basePath = buildCustomerPortalBasePath(customerToken)
  if (!basePath) return null
  return `${basePath}/order/${deliveryDate}`
}

export function buildCustomerOrderDeepLink(
  customerToken: string | null | undefined,
  orderId: string
): string | null {
  const basePath = buildCustomerPortalBasePath(customerToken)
  if (!basePath) return null
  return `${basePath}/order/link/${orderId}`
}
