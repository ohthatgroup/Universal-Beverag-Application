import { describe, expect, it } from 'vitest'
import { buildAbsoluteUrl, buildAuthCallbackUrl, getPublicAppUrl } from '@/lib/config/public-url'

describe('public URL helpers', () => {
  it('returns the pinned app host without trailing slash', () => {
    expect(getPublicAppUrl()).toBe('https://universal-beverag-application.vercel.app')
  })

  it('builds absolute URLs from relative paths', () => {
    expect(buildAbsoluteUrl('/order/link/abc')).toBe(
      'https://universal-beverag-application.vercel.app/order/link/abc'
    )
    expect(buildAbsoluteUrl('orders')).toBe(
      'https://universal-beverag-application.vercel.app/orders'
    )
  })

  it('builds callback URLs with encoded next path', () => {
    expect(buildAuthCallbackUrl('/order/link/abc')).toBe(
      'https://universal-beverag-application.vercel.app/auth/callback?next=%2Forder%2Flink%2Fabc'
    )
    expect(buildAuthCallbackUrl('https://malicious.example')).toBe(
      'https://universal-beverag-application.vercel.app/auth/callback?next=%2F'
    )
  })
})
