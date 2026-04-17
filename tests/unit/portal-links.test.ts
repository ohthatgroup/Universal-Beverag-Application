import { describe, expect, it } from 'vitest'
import {
  buildCustomerOrderDeepLink,
  buildCustomerPortalBasePath,
  buildCustomerPortalOrderDatePath,
} from '@/lib/portal-links'

describe('buildCustomerOrderDeepLink', () => {
  it('builds customer portal base path when token exists', () => {
    expect(buildCustomerPortalBasePath('abc123')).toBe('/portal/abc123')
  })

  it('builds customer portal order date path when token exists', () => {
    expect(buildCustomerPortalOrderDatePath('abc123', '2026-04-16')).toBe('/portal/abc123/order/2026-04-16')
  })

  it('builds customer portal order link when token exists', () => {
    expect(buildCustomerOrderDeepLink('abc123', 'order-1')).toBe('/portal/abc123/order/link/order-1')
  })

  it('returns null when token is missing', () => {
    expect(buildCustomerOrderDeepLink(null, 'order-1')).toBeNull()
    expect(buildCustomerOrderDeepLink(undefined, 'order-1')).toBeNull()
    expect(buildCustomerOrderDeepLink('', 'order-1')).toBeNull()
  })
})
