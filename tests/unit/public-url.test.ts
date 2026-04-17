import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildAbsoluteUrl,
  buildAuthCallbackUrl,
  buildInteractiveUrl,
  getInteractiveAppOrigin,
  getPublicAppUrl,
} from '@/lib/config/public-url'

describe('public URL helpers', () => {
  const originalEnv = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    APP_URL: process.env.APP_URL,
  }

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv.NEXT_PUBLIC_APP_URL
    process.env.APP_URL = originalEnv.APP_URL
    vi.unstubAllGlobals()
  })

  it('returns the configured app host without trailing slash', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview.example.com/'

    expect(getPublicAppUrl()).toBe('https://preview.example.com')
  })

  it('builds absolute URLs from relative paths', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview.example.com/'

    expect(buildAbsoluteUrl('/order/link/abc')).toBe(
      'https://preview.example.com/order/link/abc'
    )
    expect(buildAbsoluteUrl('orders')).toBe('https://preview.example.com/orders')
  })

  it('builds callback URLs with encoded next path', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview.example.com/'

    expect(buildAuthCallbackUrl('/order/link/abc')).toBe(
      'https://preview.example.com/auth/callback?next=%2Forder%2Flink%2Fabc'
    )
    expect(buildAuthCallbackUrl('https://malicious.example')).toBe(
      'https://preview.example.com/auth/callback?next=%2F'
    )
  })

  it('uses the current browser origin for interactive URLs', () => {
    vi.stubGlobal('window', { location: { origin: 'https://deploy.example.com' } })

    expect(getInteractiveAppOrigin()).toBe('https://deploy.example.com')
    expect(buildInteractiveUrl('/auth/reset-password')).toBe('https://deploy.example.com/auth/reset-password')
  })

  it('falls back to the configured app URL for interactive URLs outside the browser', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview.example.com/'

    expect(getInteractiveAppOrigin()).toBe('https://preview.example.com')
    expect(buildInteractiveUrl('/api/auth')).toBe('https://preview.example.com/api/auth')
  })

  it('throws when no configured public app URL exists for server-generated links', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.APP_URL

    expect(() => getPublicAppUrl()).toThrow('Missing required environment variable: NEXT_PUBLIC_APP_URL')
  })
})
