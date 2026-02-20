import { describe, expect, it } from 'vitest'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'

describe('buildCustomerOrderDeepLink', () => {
  it('builds customer portal order link when token exists', () => {
    expect(buildCustomerOrderDeepLink('abc123', 'order-1')).toBe('/c/abc123/order/link/order-1')
  })

  it('returns null when token is missing', () => {
    expect(buildCustomerOrderDeepLink(null, 'order-1')).toBeNull()
    expect(buildCustomerOrderDeepLink(undefined, 'order-1')).toBeNull()
    expect(buildCustomerOrderDeepLink('', 'order-1')).toBeNull()
  })
})

