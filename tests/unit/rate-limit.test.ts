import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildRateLimitKey,
  consumeRateLimit,
  getClientAddress,
  getEnvRateLimit,
  resetRateLimitStoreForTests,
} from '@/lib/server/rate-limit'

describe('rate limit helpers', () => {
  beforeEach(() => {
    resetRateLimitStoreForTests()
    delete process.env.TEST_RATE_LIMIT_MAX
    delete process.env.TEST_RATE_LIMIT_WINDOW_MS
  })

  it('uses Cloudflare client IP when available', () => {
    const request = new Request('https://example.com', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.1, 198.51.100.2',
      },
    })

    expect(getClientAddress(request)).toBe('203.0.113.10')
    expect(buildRateLimitKey('scope', request, ['user-1'])).toBe('scope:203.0.113.10:user-1')
  })

  it('falls back to the first x-forwarded-for value', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '198.51.100.1, 198.51.100.2',
      },
    })

    expect(getClientAddress(request)).toBe('198.51.100.1')
  })

  it('enforces the configured request budget and reports retry timing', () => {
    const now = Date.UTC(2026, 3, 16, 17, 0, 0)

    expect(consumeRateLimit({ key: 'invite', maxRequests: 2, windowMs: 60_000, now })).toMatchObject({
      limit: 2,
      remaining: 1,
    })
    expect(consumeRateLimit({ key: 'invite', maxRequests: 2, windowMs: 60_000, now: now + 1_000 })).toMatchObject(
      {
        limit: 2,
        remaining: 0,
      }
    )

    expect(() =>
      consumeRateLimit({ key: 'invite', maxRequests: 2, windowMs: 60_000, now: now + 2_000 })
    ).toThrowError(/Too many requests/)

    try {
      consumeRateLimit({ key: 'invite', maxRequests: 2, windowMs: 60_000, now: now + 2_000 })
    } catch (error) {
      expect(error).toMatchObject({
        status: 429,
        code: 'rate_limited',
        details: {
          retryAfterSeconds: 58,
        },
      })
    }
  })

  it('resets the budget after the window expires', () => {
    const now = Date.UTC(2026, 3, 16, 17, 0, 0)

    consumeRateLimit({ key: 'upload', maxRequests: 1, windowMs: 10_000, now })

    expect(() =>
      consumeRateLimit({ key: 'upload', maxRequests: 1, windowMs: 10_000, now: now + 1 })
    ).toThrow()

    expect(
      consumeRateLimit({ key: 'upload', maxRequests: 1, windowMs: 10_000, now: now + 10_001 })
    ).toMatchObject({
      limit: 1,
      remaining: 0,
    })
  })

  it('prefers explicit env overrides when they are valid', () => {
    process.env.TEST_RATE_LIMIT_MAX = '12'
    process.env.TEST_RATE_LIMIT_WINDOW_MS = '45000'

    expect(
      getEnvRateLimit('TEST_RATE_LIMIT_MAX', 'TEST_RATE_LIMIT_WINDOW_MS', {
        maxRequests: 3,
        windowMs: 5_000,
      })
    ).toEqual({
      maxRequests: 12,
      windowMs: 45_000,
    })
  })

  it('falls back to defaults when env overrides are invalid', () => {
    process.env.TEST_RATE_LIMIT_MAX = '0'
    process.env.TEST_RATE_LIMIT_WINDOW_MS = 'bad'

    expect(
      getEnvRateLimit('TEST_RATE_LIMIT_MAX', 'TEST_RATE_LIMIT_WINDOW_MS', {
        maxRequests: 3,
        windowMs: 5_000,
      })
    ).toEqual({
      maxRequests: 3,
      windowMs: 5_000,
    })
  })
})
